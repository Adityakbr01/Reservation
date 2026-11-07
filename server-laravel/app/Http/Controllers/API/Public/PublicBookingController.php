<?php

namespace App\Http\Controllers\API\Public;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingItem;
use App\Models\Cottage;
use App\Models\Coupon;
use App\Models\Property;
use App\Models\RatePlan;
use App\Models\Room;
use App\Models\User;
use Firebase\JWT\JWT;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class PublicBookingController extends Controller
{
    /**
     * Authoritative pre-booking quote (100% public, no authentication required).
     * All amounts are returned in minor units (pence).
     */
    public function quote(Request $request)
    {
        $request->validate([
            'roomTypeId' => 'nullable|string',
            'room_type_id' => 'nullable|string',
            'ratePlanId' => 'nullable|string',
            'rate_plan_id' => 'nullable|string',
            'checkIn' => 'nullable|date',
            'check_in' => 'nullable|date',
            'checkOut' => 'nullable|date',
            'check_out' => 'nullable|date',
            'quantity' => 'nullable|integer|min:1',
            'couponCode' => 'nullable|string',
            'coupon_code' => 'nullable|string',
        ]);

        $cottageId = $request->input('roomTypeId') ?? $request->input('room_type_id');
        $ratePlanId = $request->input('ratePlanId') ?? $request->input('rate_plan_id');
        $checkIn = $request->input('checkIn') ?? $request->input('check_in') ?? date('Y-m-d');
        $checkOut = $request->input('checkOut') ?? $request->input('check_out') ?? date('Y-m-d', strtotime('+2 days'));
        $quantity = (int) ($request->input('quantity', 1) ?: 1);
        $couponCode = trim((string) ($request->input('couponCode') ?? $request->input('coupon_code') ?? ''));

        $cottage = Cottage::where('id', $cottageId)->orWhere('slug', $cottageId)->first();
        $ratePlan = null;
        if ($ratePlanId) {
            $ratePlan = RatePlan::where('id', $ratePlanId)->first();
        }
        if (! $ratePlan && $cottage) {
            $ratePlan = RatePlan::where('room_type_id', $cottage->id)->where('status', 'ACTIVE')->first();
        }

        $nights = max(1, (int) round((strtotime($checkOut) - strtotime($checkIn)) / 86400));

        // Determine nightly amount in pence (minor units)
        $perNightPence = 15000;
        if ($ratePlan && is_array($ratePlan->pricing)) {
            $raw = $ratePlan->pricing['amount'] ?? $ratePlan->pricing['basePrice'] ?? $ratePlan->pricing['base_price'] ?? null;
            if ($raw !== null) {
                $rawInt = (int) $raw;
                $perNightPence = ($rawInt < 1000 && $rawInt > 0) ? ($rawInt * 100) : $rawInt;
            }
        }

        $subtotal = $perNightPence * $nights * $quantity;
        $discount = 0;

        if ($couponCode !== '') {
            $coupon = Coupon::where('code', $couponCode)->where('status', 'ACTIVE')->first();
            if ($coupon) {
                if ($coupon->discount_type === 'PERCENTAGE') {
                    $discount = (int) round($subtotal * (($coupon->discount_value ?? 0) / 100));
                } else {
                    $val = (int) ($coupon->discount_value ?? 0);
                    $discount = ($val < 1000 && $val > 0) ? ($val * 100) : $val;
                }
                $discount = min($subtotal, $discount);
            }
        }

        $tax = 0;
        $total = max(0, $subtotal - $discount + $tax);
        $currency = $ratePlan?->pricing['currency']
            ?? \App\Models\SiteSettings::first()?->currency
            ?? \App\Models\Property::first()?->currency
            ?? 'GBP';

        $nightly = [];
        $current = strtotime($checkIn);
        for ($i = 0; $i < $nights; $i++) {
            $nightly[] = [
                'date' => date('Y-m-d', $current),
                'price' => $perNightPence,
            ];
            $current = strtotime('+1 day', $current);
        }

        $quoteId = bin2hex(random_bytes(10));

        return response()->json([
            'success' => true,
            'data' => [
                'quoteId' => $quoteId,
                'quote_id' => $quoteId,
                'expiresAt' => date('c', strtotime('+15 minutes')),
                'pricing' => [
                    'subtotal' => $subtotal,
                    'discount' => $discount,
                    'tax' => $tax,
                    'total' => $total,
                    'currency' => $currency,
                ],
                'nights' => $nights,
                'nightly' => $nightly,
            ],
        ], 201);
    }

    /**
     * Check if a guest email is already registered.
     */
    public function checkEmail(Request $request)
    {
        $email = strtolower(trim((string) $request->input('email')));
        $exists = $email !== '' && User::where('email', $email)->exists();

        return response()->json([
            'success' => true,
            'data' => ['exists' => $exists],
        ]);
    }

    /**
     * Frictionless guest booking (public, silent account provisioning, instant token).
     */
    public function guestStore(Request $request)
    {
        return $this->processBooking($request, isGuestFlow: true);
    }

    /**
     * Standard booking endpoint (supports both authenticated users and guests).
     */
    public function store(Request $request)
    {
        return $this->processBooking($request, isGuestFlow: false);
    }

    private function processBooking(Request $request, bool $isGuestFlow = false)
    {
        $contact = $request->input('contact', []);
        $email = strtolower(trim((string) ($contact['email'] ?? $request->input('email', ''))));
        if ($email === '') {
            $authUser = $request->attributes->get('auth_user');
            $email = $authUser?->email ?? 'guest@hamptworthstays.com';
        }

        $firstName = trim((string) ($contact['firstName'] ?? $contact['first_name'] ?? ''));
        $lastName = trim((string) ($contact['lastName'] ?? $contact['last_name'] ?? ''));
        $displayName = trim("{$firstName} {$lastName}") ?: 'Guest Customer';

        $user = User::where('email', $email)->first();
        $isNewAccount = false;
        if (! $user) {
            $user = User::create([
                'id' => bin2hex(random_bytes(12)),
                'name' => $displayName,
                'email' => $email,
                'password_hash' => Hash::make(bin2hex(random_bytes(10))),
                'role' => 'customer',
                'is_active' => true,
            ]);
            $isNewAccount = true;
        }

        $checkIn = $request->input('checkIn') ?? $request->input('check_in') ?? date('Y-m-d');
        $checkOut = $request->input('checkOut') ?? $request->input('check_out') ?? date('Y-m-d', strtotime('+2 days'));
        $guests = $request->input('guests', ['adults' => 2, 'children' => 0]);
        $defaultProp = Property::defaultProperty();

        // Process rooms / cottages requested
        $roomsInput = $request->input('rooms', []);
        if (empty($roomsInput) && $request->filled('roomTypeId')) {
            $roomsInput = [[
                'roomTypeId' => $request->input('roomTypeId'),
                'ratePlanId' => $request->input('ratePlanId'),
                'quantity' => 1,
            ]];
        }

        $subtotal = 0;
        $nights = max(1, (int) round((strtotime($checkOut) - strtotime($checkIn)) / 86400));
        $bookingItemsData = [];

        foreach ($roomsInput as $r) {
            $cid = $r['roomTypeId'] ?? $r['room_type_id'] ?? null;
            $rpid = $r['ratePlanId'] ?? $r['rate_plan_id'] ?? null;
            $qty = (int) ($r['quantity'] ?? 1);

            $cottage = Cottage::where('id', $cid)->orWhere('slug', $cid)->first();
            $ratePlan = null;
            if ($rpid) {
                $ratePlan = RatePlan::where('id', $rpid)->first();
            }
            if (! $ratePlan && $cottage) {
                $ratePlan = RatePlan::where('room_type_id', $cottage->id)->first();
            }

            $perNightPence = 15000;
            if ($ratePlan && is_array($ratePlan->pricing)) {
                $raw = $ratePlan->pricing['amount'] ?? $ratePlan->pricing['basePrice'] ?? $ratePlan->pricing['base_price'] ?? null;
                if ($raw !== null) {
                    $rawInt = (int) $raw;
                    $perNightPence = ($rawInt < 1000 && $rawInt > 0) ? ($rawInt * 100) : $rawInt;
                }
            }

            $cottageStay = $perNightPence * $nights * $qty;
            $subtotal += $cottageStay;

            // Ensure physical room record exists for foreign key
            $room = null;
            if ($cottage) {
                $room = Room::where('room_type_id', $cottage->id)->first();
                if (! $room) {
                    $room = Room::create([
                        'id' => bin2hex(random_bytes(12)),
                        'property_id' => $defaultProp->id,
                        'room_type_id' => $cottage->id,
                        'name' => $cottage->name,
                        'room_number' => strtoupper(substr($cottage->slug ?? 'COT', 0, 3)) . '-1',
                        'status' => 'ACTIVE',
                    ]);
                }
            }

            $bookingItemsData[] = [
                'cottage' => $cottage,
                'ratePlan' => $ratePlan,
                'room' => $room,
                'qty' => $qty,
                'unitTotal' => $cottageStay,
                'perNight' => $perNightPence,
            ];
        }

        if ($subtotal === 0) {
            $subtotal = 15000 * $nights;
        }

        $discount = 0;
        $couponCode = trim((string) ($request->input('couponCode') ?? $request->input('coupon_code') ?? ''));
        if ($couponCode !== '') {
            $coupon = Coupon::where('code', $couponCode)->where('status', 'ACTIVE')->first();
            if ($coupon) {
                if ($coupon->discount_type === 'PERCENTAGE') {
                    $discount = (int) round($subtotal * (($coupon->discount_value ?? 0) / 100));
                } else {
                    $val = (int) ($coupon->discount_value ?? 0);
                    $discount = ($val < 1000 && $val > 0) ? ($val * 100) : $val;
                }
                $discount = min($subtotal, $discount);
            }
        }

        $total = max(0, $subtotal - $discount);
        $bookingNumber = 'BK' . strtoupper(bin2hex(random_bytes(4)));

        $activeCurrency = \App\Models\SiteSettings::first()?->currency
            ?? \App\Models\Property::first()?->currency
            ?? 'GBP';

        $pricingPayload = [
            'subtotal' => $subtotal,
            'discount' => $discount,
            'taxes' => 0,
            'fees' => 0,
            'total' => $total,
            'currency' => $activeCurrency,
        ];

        $booking = Booking::create([
            'id' => bin2hex(random_bytes(12)),
            'booking_number' => $bookingNumber,
            'property_id' => $defaultProp->id,
            'user_id' => $user->id,
            'status' => 'HELD',
            'payment_status' => 'PENDING',
            'check_in' => $checkIn,
            'check_out' => $checkOut,
            'guests' => $guests,
            'contact' => $contact,
            'pricing' => $pricingPayload,
            'source' => 'DIRECT',
            'notes' => $request->input('notes'),
            'reminder_sent' => false,
        ]);

        $items = [];
        foreach ($bookingItemsData as $itemData) {
            $bItem = BookingItem::create([
                'id' => bin2hex(random_bytes(12)),
                'booking_id' => $booking->id,
                'room_type_id' => $itemData['cottage']?->id,
                'room_id' => $itemData['room']?->id,
                'rate_plan_id' => $itemData['ratePlan']?->id,
                'room_name_snapshot' => $itemData['cottage']?->name ?? 'Cottage',
                'room_number_snapshot' => $itemData['room']?->room_number ?? 'COT-1',
                'rate_plan_name_snapshot' => $itemData['ratePlan']?->name ?? 'Standard Rate',
                'check_in' => $checkIn,
                'check_out' => $checkOut,
                'guests' => $guests,
                'pricing' => [
                    'amount' => $itemData['unitTotal'],
                    'perNight' => $itemData['perNight'],
                    'currency' => 'GBP',
                ],
            ]);
            $items[] = $bItem;
        }

        // Generate silent token for seamless guest checkout
        $token = $this->generateJwtToken($user);
        $clientSecret = 'pi_mock_' . bin2hex(random_bytes(12)) . '_secret_' . bin2hex(random_bytes(8));

        return response()->json([
            'success' => true,
            'data' => [
                'booking' => [
                    'id' => $booking->id,
                    'bookingNumber' => $booking->booking_number,
                    'booking_number' => $booking->booking_number,
                    'status' => $booking->status,
                    'paymentStatus' => $booking->payment_status,
                    'checkIn' => $booking->check_in,
                    'checkOut' => $booking->check_out,
                    'pricing' => $pricingPayload,
                    'contact' => $booking->contact,
                    'guests' => $booking->guests,
                ],
                'items' => $items,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                ],
                'token' => $token,
                'isNewAccount' => $isNewAccount,
                'idempotentReplay' => false,
                'payment' => [
                    'paymentId' => 'pay_' . bin2hex(random_bytes(8)),
                    'clientSecret' => $clientSecret,
                    'reused' => false,
                ],
                'paymentError' => null,
            ],
        ], 201);
    }

    public function show(string $id)
    {
        $booking = Booking::where('id', $id)->first();
        if (! $booking) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'BOOKING_NOT_FOUND', 'message' => 'Booking not found'],
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'booking' => $this->bookingData($booking),
            ],
        ]);
    }

    public function receipt(string $id)
    {
        $booking = Booking::where('id', $id)->first();
        if (! $booking) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'BOOKING_NOT_FOUND', 'message' => 'Booking not found'],
            ], 404);
        }

        $contact = is_array($booking->contact) ? $booking->contact : [];
        $guestName = trim(($contact['firstName'] ?? '') . ' ' . ($contact['lastName'] ?? '')) ?: ($booking->user?->name ?? 'Guest Customer');

        return response()->json([
            'success' => true,
            'data' => [
                'bookingNumber' => $booking->booking_number,
                'booking_number' => $booking->booking_number,
                'status' => $booking->status,
                'paymentStatus' => $booking->payment_status,
                'payment_status' => $booking->payment_status,
                'checkIn' => $booking->check_in,
                'check_in' => $booking->check_in,
                'checkOut' => $booking->check_out,
                'check_out' => $booking->check_out,
                'guests' => $booking->guests,
                'guestName' => $guestName,
                'guestEmail' => $contact['email'] ?? $booking->user?->email ?? '',
                'guestPhone' => $contact['phone'] ?? $contact['telephone'] ?? '',
                'pricing' => $booking->pricing ?? [
                    'currency' => 'GBP',
                    'subtotal' => 0,
                    'discount' => 0,
                    'taxes' => 0,
                    'fees' => 0,
                    'total' => 0,
                ],
            ],
        ]);
    }

    public function createIntent(Request $request)
    {
        $bookingId = $request->input('bookingId') ?? $request->input('booking_id');
        $clientSecret = 'pi_' . bin2hex(random_bytes(10)) . '_secret_' . bin2hex(random_bytes(8));

        return response()->json([
            'success' => true,
            'data' => [
                'paymentId' => 'pay_' . bin2hex(random_bytes(8)),
                'clientSecret' => $clientSecret,
                'client_secret' => $clientSecret,
                'reused' => false,
            ],
        ]);
    }

    public function paymentShow(string $id)
    {
        return response()->json([
            'success' => true,
            'data' => [
                'id' => $id,
                'status' => 'SUCCEEDED',
            ],
        ]);
    }

    public function cancel(string $id)
    {
        $booking = Booking::where('id', $id)->first();
        if (! $booking) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'BOOKING_NOT_FOUND', 'message' => 'Booking not found'],
            ], 404);
        }

        $booking->status = 'CANCELLED';
        $booking->save();

        return response()->json([
            'success' => true,
            'data' => $this->bookingData($booking),
        ]);
    }

    public function myIndex()
    {
        $userId = request()->attributes->get('auth_user')?->id;
        $bookings = $userId ? Booking::where('user_id', $userId)->orderBy('created_at', 'desc')->get() : collect([]);

        return response()->json([
            'success' => true,
            'data' => $bookings->map(fn ($b) => $this->bookingData($b)),
            'meta' => ['page' => 1, 'limit' => 20, 'total' => count($bookings), 'totalPages' => 1],
        ]);
    }

    public function myShow(string $id)
    {
        $userId = request()->attributes->get('auth_user')?->id;
        $booking = Booking::where('id', $id)->when($userId, fn($q) => $q->where('user_id', $userId))->first();

        if (! $booking) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'BOOKING_NOT_FOUND', 'message' => 'Booking not found'],
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->bookingData($booking),
        ]);
    }

    private function bookingData(Booking $b): array
    {
        return [
            'id' => $b->id,
            'bookingNumber' => $b->booking_number,
            'booking_number' => $b->booking_number,
            'status' => $b->status,
            'paymentStatus' => $b->payment_status,
            'payment_status' => $b->payment_status,
            'checkIn' => $b->check_in,
            'check_in' => $b->check_in,
            'checkOut' => $b->check_out,
            'check_out' => $b->check_out,
            'guests' => $b->guests,
            'contact' => $b->contact,
            'pricing' => $b->pricing,
        ];
    }

    private function generateJwtToken(User $user): string
    {
        $secret = config('jwt.secret') ?: 'default_secret_key_for_testing_min_32_chars_long';
        $now = now();
        $exp = $now->copy()->addMinutes((int) config('jwt.ttl', 10080)); // 7 days for guests
        $payload = [
            'iss' => config('app.url', 'https://laravel.hamptworthstays.com'),
            'iat' => $now->timestamp,
            'exp' => $exp->timestamp,
            'nbf' => $now->timestamp,
            'sub' => $user->id,
            'jti' => bin2hex(random_bytes(16)),
        ];

        return JWT::encode($payload, $secret, config('jwt.algo', 'HS256'));
    }
}
