<?php

namespace App\Http\Controllers\API\Public;

use App\Http\Controllers\Controller;
use App\Models\AvailabilityBlock;
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
use Illuminate\Validation\ValidationException;

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
            'dogs' => 'nullable|integer|min:0',
            'dogsCount' => 'nullable|integer|min:0',
        ]);

        $cottageId = $request->input('roomTypeId') ?? $request->input('room_type_id');
        $ratePlanId = $request->input('ratePlanId') ?? $request->input('rate_plan_id');
        $checkIn = $request->input('checkIn') ?? $request->input('check_in') ?? date('Y-m-d');
        $checkOut = $request->input('checkOut') ?? $request->input('check_out') ?? date('Y-m-d', strtotime('+2 days'));
        
        $minStay = (int) (\App\Models\SiteSettings::first()?->minimum_stay_nights ?? 2);
        if ($minStay < 1) {
            $minStay = 2;
        }

        $requestedNights = (int) round((strtotime($checkOut) - strtotime($checkIn)) / 86400);
        if ($requestedNights < $minStay) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'MIN_STAY_NOT_MET',
                    'message' => "A minimum stay of {$minStay} nights is required.",
                ],
            ], 422);
        }
        $quantity = (int) ($request->input('quantity', 1) ?: 1);
        $couponCode = trim((string) ($request->input('couponCode') ?? $request->input('coupon_code') ?? ''));
        $dogsCount = (int) ($request->input('dogs') ?? $request->input('dogsCount') ?? 0);
        $adultsCount = (int) ($request->input('adults') ?? 2);
        $extrasRequested = $request->input('extras') ?? $request->input('selectedExtras') ?? [];
        if (is_string($extrasRequested)) {
            $extrasRequested = array_map(fn ($id) => ['id' => $id, 'qty' => 1], explode(',', $extrasRequested));
        }
        if (!is_array($extrasRequested)) {
            $extrasRequested = [];
        }
        // Normalize to [{id, qty}] for validation & pricing.
        $normalizedExtras = [];
        foreach ($extrasRequested as $ex) {
            if (!is_array($ex)) {
                $normalizedExtras[] = ['id' => (string) $ex, 'qty' => 1];
                continue;
            }
            $normalizedExtras[] = [
                'id' => (string) ($ex['id'] ?? ''),
                'qty' => (int) ($ex['qty'] ?? 1),
            ];
        }

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
            if (isset($ratePlan->pricing['amount']) && is_numeric($ratePlan->pricing['amount'])) {
                $perNightPence = (int) $ratePlan->pricing['amount'];
            } elseif (isset($ratePlan->pricing['basePrice']) && is_numeric($ratePlan->pricing['basePrice'])) {
                $perNightPence = (int) round(((float) $ratePlan->pricing['basePrice']) * 100);
            } elseif (isset($ratePlan->pricing['base_price']) && is_numeric($ratePlan->pricing['base_price'])) {
                $perNightPence = (int) round(((float) $ratePlan->pricing['base_price']) * 100);
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
                    $discount = $val;
                }
                $discount = min($subtotal, $discount);
            }
        }

        // Calculate dog fee if guest opted to bring dog(s) and cottage allows dogs
        $dogFeePence = 0;
        if ($dogsCount > 0 && $cottage) {
            $dogFees = is_array($cottage->dog_fees) ? $cottage->dog_fees : (is_string($cottage->dog_fees) ? (json_decode($cottage->dog_fees, true) ?? []) : []);
            $isDogFriendly = ($cottage->dog_policy_enabled !== false) && ((int) ($cottage->max_dogs ?? 0) > 0);
            if ($isDogFriendly) {
                // Custom per-count dog fees take precedence over flat dog_fee * count.
                $customFee = null;
                if (isset($dogFees[$dogsCount])) {
                    $customFee = (float) $dogFees[$dogsCount];
                } elseif (isset($dogFees[(string) $dogsCount])) {
                    $customFee = (float) $dogFees[(string) $dogsCount];
                }

                if ($customFee !== null && $customFee >= 0) {
                    $dogFeePence = (int) round($customFee * 100);
                } else {
                    $unitDogFee = $cottage->dog_fee !== null ? (float) $cottage->dog_fee : 70.00;
                    $dogFeePence = (int) round($unitDogFee * 100) * $dogsCount;
                }
            }
        }

        // Calculate optional extras fee (server-authoritative qty validation).
        $extrasFeePence = 0;
        $pricedExtras = [];
        if (!empty($normalizedExtras)) {
            $extrasById = [];

            // 1. Check Global Extras from SiteSettings
            $siteSettings = \App\Models\SiteSettings::first();
            $globalExtras = $siteSettings?->booking_page['globalExtras'] ?? $siteSettings?->booking_page['global_extras'] ?? [];
            if (is_array($globalExtras)) {
                foreach ($globalExtras as $candidate) {
                    $candId = is_array($candidate) ? ($candidate['id'] ?? null) : ($candidate->id ?? null);
                    if ($candId) {
                        $extrasById[(string) $candId] = (array) $candidate;
                    }
                }
            }

            // 2. Check Cottage-specific extras
            if ($cottage && !empty($cottage->extras)) {
                $cotExtras = is_array($cottage->extras) ? $cottage->extras : (json_decode($cottage->extras, true) ?? []);
                foreach ($cotExtras as $candidate) {
                    $candId = is_array($candidate) ? ($candidate['id'] ?? null) : ($candidate->id ?? null);
                    if ($candId && !isset($extrasById[(string) $candId])) {
                        $extrasById[(string) $candId] = (array) $candidate;
                    }
                }
            }
            $validationErrors = [];
            foreach ($normalizedExtras as $item) {
                $id = $item['id'] ?? '';
                $qty = (int) ($item['qty'] ?? 1);
                if ($qty <= 0) {
                    continue; // not selected
                }
                if (!isset($extrasById[$id])) {
                    continue; // unknown extra ignored
                }
                $ex = $extrasById[$id];
                $showCounter = $ex['showCounter'] ?? true;
                $min = (int) ($ex['min'] ?? ($showCounter ? 1 : 0));
                $maxRaw = $ex['max'] ?? null;
                $max = ($maxRaw === null || $maxRaw === '') ? null : (int) $maxRaw;
                if ($showCounter && $max !== null && $qty > $max) {
                    $extraTitle = $ex['title'] ?? $id;
                    $validationErrors[] = "Extra \"{$extraTitle}\" quantity exceeds maximum of {$max}.";
                    $qty = $max;
                }
                if ($showCounter && $qty < $min) {
                    $qty = $min;
                }
                if ($qty <= 0) {
                    continue;
                }
                $p = (float) ($ex['price'] ?? 0);
                $unitAmount = ($ex['pricingType'] ?? '') === 'PER_PERSON' ? ($p * max(1, $adultsCount)) : $p;
                $itemAmount = $unitAmount * $qty;
                $extrasFeePence += (int) round($itemAmount * 100);
                $pricedExtras[] = [
                    'id' => $id,
                    'title' => $ex['title'] ?? '',
                    'qty' => $qty,
                    'lineAmount' => (int) round($itemAmount * 100),
                ];
            }
            if (!empty($validationErrors)) {
                throw ValidationException::withMessages([
                    'extras' => $validationErrors,
                ]);
            }
        }

        $tax = 0;
        $total = max(0, $subtotal - $discount + $tax + $dogFeePence + $extrasFeePence);
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
                    'fees' => $dogFeePence + $extrasFeePence,
                    'dogFee' => $dogFeePence,
                    'dog_fee' => $dogFeePence,
                    'dogsCount' => $dogsCount,
                    'dogs_count' => $dogsCount,
                    'extrasFee' => $extrasFeePence,
                    'extras_fee' => $extrasFeePence,
                    'extras' => $pricedExtras,
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

        $minStay = (int) (\App\Models\SiteSettings::first()?->minimum_stay_nights ?? 2);
        if ($minStay < 1) {
            $minStay = 2;
        }

        $requestedNights = (int) round((strtotime($checkOut) - strtotime($checkIn)) / 86400);
        if ($requestedNights < $minStay) {
            return response()->json([
                'success' => false,
                'error' => [
                    'code' => 'MIN_STAY_NOT_MET',
                    'message' => "A minimum stay of {$minStay} nights is required.",
                ],
            ], 422);
        }

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
                if (isset($ratePlan->pricing['amount']) && is_numeric($ratePlan->pricing['amount'])) {
                    $perNightPence = (int) $ratePlan->pricing['amount'];
                } elseif (isset($ratePlan->pricing['basePrice']) && is_numeric($ratePlan->pricing['basePrice'])) {
                    $perNightPence = (int) round(((float) $ratePlan->pricing['basePrice']) * 100);
                } elseif (isset($ratePlan->pricing['base_price']) && is_numeric($ratePlan->pricing['base_price'])) {
                    $perNightPence = (int) round(((float) $ratePlan->pricing['base_price']) * 100);
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

                // Authoritative availability check: verify neither room nor cottage is blocked or already booked
                $checkInStart = \Carbon\Carbon::parse($checkIn)->startOfDay()->format('Y-m-d H:i:s');
                $checkOutStart = \Carbon\Carbon::parse($checkOut)->startOfDay()->format('Y-m-d H:i:s');

                $isBlocked = AvailabilityBlock::where(function ($q) use ($room, $cottage) {
                        if ($room) {
                            $q->where('room_id', $room->id);
                        }
                        $q->orWhere('room_id', $cottage->id);
                    })
                    ->where('start_date', '<', $checkOutStart)
                    ->where('end_date', '>', $checkInStart)
                    ->exists();

                $isBooked = BookingItem::activeBookings()
                    ->where(function ($q) use ($room, $cottage) {
                        if ($room) {
                            $q->where('room_id', $room->id);
                        }
                        $q->orWhere('room_type_id', $cottage->id);
                    })
                    ->where('check_in', '<', $checkOut)
                    ->where('check_out', '>', $checkIn)
                    ->exists();

                if ($isBlocked || $isBooked) {
                    $reason = $isBlocked ? 'is blocked and unavailable for the selected dates' : 'is already booked for the selected dates';
                    return response()->json([
                        'success' => false,
                        'error' => [
                            'code' => 'ROOM_UNAVAILABLE',
                            'message' => "Sorry, {$cottage->name} {$reason}. Please select different dates or choose another cottage.",
                        ],
                    ], 422);
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
                    $discount = $val;
                }
                $discount = min($subtotal, $discount);
            }
        }

        $total = max(0, $subtotal - $discount);

        $dogsCount = (int) ($request->input('dogs') ?? $request->input('dogsCount') ?? ($guests['dogs'] ?? 0));
        $dogsByCottageInput = $request->input('dogsByCottage') ?? [];
        if (!is_array($dogsByCottageInput)) {
            $dogsByCottageInput = [];
        }

        $dogFeePence = 0;
        $dogDetails = [];

        if (!empty($dogsByCottageInput)) {
            // Precise per-cottage dog distribution
            foreach ($bookingItemsData as $itemData) {
                $cot = $itemData['cottage'];
                if (!$cot) continue;
                $cotDogs = (int) ($dogsByCottageInput[$cot->id] ?? $dogsByCottageInput[(string) $cot->id] ?? 0);
                if ($cotDogs <= 0) continue;

                $dogFees = is_array($cot->dog_fees) ? $cot->dog_fees : (is_string($cot->dog_fees) ? (json_decode($cot->dog_fees, true) ?? []) : []);
                $isDogFriendly = (bool) ($cot->dog_policy_enabled) || ((int) ($cot->max_dogs ?? 0) > 0) || !empty($dogFees);
                if (!$isDogFriendly) continue;

                $customFee = null;
                if (isset($dogFees[$cotDogs])) {
                    $customFee = (float) $dogFees[$cotDogs];
                } elseif (isset($dogFees[(string) $cotDogs])) {
                    $customFee = (float) $dogFees[(string) $cotDogs];
                }

                $cotFeePence = 0;
                if ($customFee !== null && $customFee >= 0) {
                    $cotFeePence = (int) round($customFee * 100);
                } else {
                    $unitDogFee = $cot->dog_fee !== null ? (float) $cot->dog_fee : 70.00;
                    $cotFeePence = (int) round($unitDogFee * 100) * $cotDogs;
                }

                $dogFeePence += $cotFeePence;
                $dogDetails[] = [
                    'cottageId' => $cot->id,
                    'cottageName' => $cot->name,
                    'dogsCount' => $cotDogs,
                    'fee' => $cotFeePence,
                ];
            }
        } elseif ($dogsCount > 0) {
            foreach ($bookingItemsData as $itemData) {
                $cot = $itemData['cottage'];
                if ($cot) {
                    $dogFees = is_array($cot->dog_fees) ? $cot->dog_fees : (is_string($cot->dog_fees) ? (json_decode($cot->dog_fees, true) ?? []) : []);
                    $isDogFriendly = (bool) ($cot->dog_policy_enabled) || ((int) ($cot->max_dogs ?? 0) > 0) || !empty($dogFees);
                    if ($isDogFriendly) {
                        $customFee = null;
                        if (isset($dogFees[$dogsCount])) {
                            $customFee = (float) $dogFees[$dogsCount];
                        } elseif (isset($dogFees[(string) $dogsCount])) {
                            $customFee = (float) $dogFees[(string) $dogsCount];
                        }
                        if ($customFee !== null && $customFee >= 0) {
                            $dogFeePence = (int) round($customFee * 100);
                        } else {
                            $unitDogFee = $cot->dog_fee !== null ? (float) $cot->dog_fee : 70.00;
                            $dogFeePence = (int) round($unitDogFee * 100) * $dogsCount;
                        }
                        $dogDetails[] = [
                            'cottageId' => $cot->id,
                            'cottageName' => $cot->name,
                            'dogsCount' => $dogsCount,
                            'fee' => $dogFeePence,
                        ];
                        break;
                    }
                }
            }
        }

        // Calculate optional extras fee (server-authoritative qty validation).
        $extrasRaw = $request->input('extras') ?? $request->input('selectedExtras') ?? [];
        if (is_string($extrasRaw)) {
            $extrasRaw = array_map(fn ($id) => ['id' => $id, 'qty' => 1], explode(',', $extrasRaw));
        }
        if (!is_array($extrasRaw)) {
            $extrasRaw = [];
        }
        $normalizedExtras = [];
        foreach ($extrasRaw as $ex) {
            if (!is_array($ex)) {
                $normalizedExtras[] = ['id' => (string) $ex, 'qty' => 1, 'cottageId' => null];
                continue;
            }
            $normalizedExtras[] = [
                'id' => (string) ($ex['id'] ?? ''),
                'qty' => (int) ($ex['qty'] ?? 1),
                'cottageId' => isset($ex['cottageId']) ? (string) $ex['cottageId'] : null,
            ];
        }
        $extrasFeePence = 0;
        $pricedExtras = [];
        if (!empty($normalizedExtras)) {
            $adultsCount = (int) ($guests['adults'] ?? 2);

            // Pool all available extras: Global Settings + Selected Cottages
            $extrasById = [];
            $extrasCottageName = [];
            $siteSettings = \App\Models\SiteSettings::first();
            $globalExtras = $siteSettings?->booking_page['globalExtras'] ?? $siteSettings?->booking_page['global_extras'] ?? [];
            if (is_array($globalExtras)) {
                foreach ($globalExtras as $candidate) {
                    $candId = is_array($candidate) ? ($candidate['id'] ?? null) : ($candidate->id ?? null);
                    if ($candId) {
                        $extrasById[(string) $candId] = (array) $candidate;
                        $extrasCottageName[(string) $candId] = null;
                    }
                }
            }
            foreach ($bookingItemsData as $itemData) {
                $cot = $itemData['cottage'];
                if ($cot && !empty($cot->extras)) {
                    $cotExtras = is_array($cot->extras) ? $cot->extras : (json_decode($cot->extras, true) ?? []);
                    foreach ($cotExtras as $candidate) {
                        $candId = is_array($candidate) ? ($candidate['id'] ?? null) : ($candidate->id ?? null);
                        if ($candId && !isset($extrasById[(string) $candId])) {
                            $extrasById[(string) $candId] = (array) $candidate;
                            $extrasCottageName[(string) $candId] = $cot->name;
                        }
                    }
                }
            }

            $validationErrors = [];
            foreach ($normalizedExtras as $item) {
                $id = $item['id'] ?? '';
                $qty = (int) ($item['qty'] ?? 1);
                if ($qty <= 0) continue;
                if (!isset($extrasById[$id])) continue;

                $ex = $extrasById[$id];
                $showCounter = $ex['showCounter'] ?? true;
                $min = (int) ($ex['min'] ?? ($showCounter ? 1 : 0));
                $maxRaw = $ex['max'] ?? null;
                $max = ($maxRaw === null || $maxRaw === '') ? null : (int) $maxRaw;
                if ($showCounter && $max !== null && $qty > $max) {
                    $extraTitle = $ex['title'] ?? $id;
                    $validationErrors[] = "Extra \"{$extraTitle}\" quantity exceeds maximum of {$max}.";
                    $qty = $max;
                }
                if ($showCounter && $qty < $min) {
                    $qty = $min;
                }
                if ($qty <= 0) continue;

                $p = (float) ($ex['price'] ?? 0);
                $pricingType = $ex['pricingType'] ?? 'PER_STAY';
                $unitAmount = $pricingType === 'PER_PERSON' ? ($p * max(1, $adultsCount)) : $p;
                $itemAmount = $unitAmount * $qty;
                $linePence = (int) round($itemAmount * 100);
                $extrasFeePence += $linePence;

                $pricedExtras[] = [
                    'id' => $id,
                    'title' => $ex['title'] ?? '',
                    'cottageId' => $item['cottageId'] ?? null,
                    'cottageName' => $item['cottageId'] ? ($extrasCottageName[$id] ?? null) : null,
                    'qty' => $qty,
                    'price' => (int) round($p * 100),
                    'pricingType' => $pricingType,
                    'lineAmount' => $linePence,
                ];
            }
            if (!empty($validationErrors)) {
                throw ValidationException::withMessages([
                    'extras' => $validationErrors,
                ]);
            }
        }

        $total = max(0, $total + $dogFeePence + $extrasFeePence);
        $bookingNumber = 'BK' . strtoupper(bin2hex(random_bytes(4)));

        $activeCurrency = \App\Models\SiteSettings::first()?->currency
            ?? \App\Models\Property::first()?->currency
            ?? 'GBP';

        if (!is_array($guests)) {
            $guests = ['adults' => 2, 'children' => 0];
        }
        $guests['dogs'] = $dogsCount;

        $pricingPayload = [
            'subtotal' => $subtotal,
            'discount' => $discount,
            'taxes' => 0,
            'fees' => $dogFeePence + $extrasFeePence,
            'dogFee' => $dogFeePence,
            'dog_fee' => $dogFeePence,
            'dogsCount' => $dogsCount,
            'dogDetails' => $dogDetails,
            'extrasFee' => $extrasFeePence,
            'extras_fee' => $extrasFeePence,
            'selectedExtras' => array_column($pricedExtras, 'id'),
            'extras' => $pricedExtras,
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
        
        // Create real Stripe PaymentIntent
        $paymentService = app(\App\Services\PaymentService::class);
        $paymentResult = $paymentService->createIntent($booking);

        $clientSecret = $paymentResult['client_secret'] ?? null;
        $paymentId = $paymentResult['payment_id'] ?? ('pay_' . bin2hex(random_bytes(8)));
        $reused = $paymentResult['reused'] ?? false;
        $paymentError = $paymentResult['success'] ? null : ($paymentResult['error'] ?? 'Payment setup failed');

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
                'payment' => ($paymentResult['success'] && $clientSecret) ? [
                    'paymentId' => $paymentId,
                    'clientSecret' => $clientSecret,
                    'client_secret' => $clientSecret,
                    'reused' => $reused,
                ] : null,
                'paymentError' => $paymentError,
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
        $booking = Booking::with(['items.room.roomType', 'items.ratePlan', 'payments', 'user'])->where('id', $id)->first();
        if (! $booking) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'BOOKING_NOT_FOUND', 'message' => 'Booking not found'],
            ], 404);
        }

        if ($booking->status === 'HELD' || $booking->payment_status === 'PENDING') {
            $payment = \App\Models\Payment::where('booking_id', $booking->id)->latest()->first();
            if ($payment && $payment->provider_payment_intent_id) {
                try {
                    \Stripe\Stripe::setApiKey(config('services.stripe.secret') ?? env('STRIPE_SECRET_KEY'));
                    $intent = \Stripe\PaymentIntent::retrieve($payment->provider_payment_intent_id);
                    if ($intent && $intent->status === 'succeeded') {
                        $booking->status = 'CONFIRMED';
                        $booking->payment_status = 'PAID';
                        $booking->save();
                        $payment->status = 'PAID';
                        $payment->paid_at = now();
                        $payment->save();
                    }
                } catch (\Throwable) {
                    // Ignore transient stripe retrieval error
                }
            }
        }

        if ($booking->status === 'CONFIRMED' && $booking->payment_status === 'PAID') {
            try {
                app(\App\Services\NotificationService::class)->sendBookingConfirmation($booking);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Could not dispatch confirmation email: ' . $e->getMessage());
            }
        }

        $contact = is_array($booking->contact) ? $booking->contact : [];
        $guestName = trim(($contact['firstName'] ?? '') . ' ' . ($contact['lastName'] ?? '')) ?: ($booking->user?->name ?? 'Guest Customer');

        $formatDateIso = function ($val) {
            if (empty($val)) {
                return null;
            }
            if ($val instanceof \DateTimeInterface) {
                return $val->format('c');
            }
            $ts = strtotime((string) $val);
            return $ts ? date('c', $ts) : (string) $val;
        };

        $items = $booking->items->map(function ($it) {
            $pricing = is_array($it->pricing) ? $it->pricing : [];
            $unitTotal = (int) ($pricing['amount'] ?? $pricing['total'] ?? 0);
            $checkIn = $it->check_in ? date('Y-m-d', strtotime($it->check_in)) : null;
            $checkOut = $it->check_out ? date('Y-m-d', strtotime($it->check_out)) : null;
            return [
                'id' => $it->id,
                'roomName' => $it->room_name_snapshot ?? $it->room?->name ?? 'Cottage',
                'roomNumber' => $it->room_number_snapshot ?? $it->room?->room_number,
                'ratePlanName' => $it->rate_plan_name_snapshot ?? $it->ratePlan?->name ?? 'Standard Rate',
                'checkIn' => $checkIn,
                'checkOut' => $checkOut,
                'guests' => $it->guests ?? ['adults' => 2, 'children' => 0],
                'nightlyRates' => $it->nightly_rates ?? [],
                'subtotal' => $unitTotal,
                'discount' => 0,
                'taxes' => 0,
                'fees' => 0,
                'total' => $unitTotal,
                'currency' => $pricing['currency'] ?? 'GBP',
            ];
        })->values();

        $payments = $booking->payments->map(function ($p) use ($formatDateIso) {
            return [
                'id' => $p->id,
                'provider' => $p->provider ?? 'STRIPE',
                'amount' => (int) round(((float) $p->amount) * 100),
                'currency' => $p->currency ?? 'GBP',
                'status' => $p->status ?? 'PAID',
                'paidAt' => $formatDateIso($p->paid_at ?? $p->created_at),
            ];
        })->values();

        $pricing = is_array($booking->pricing) ? $booking->pricing : [];
        $dogDetails = $pricing['dogDetails'] ?? [];
        $extrasList = $pricing['extras'] ?? [];

        $pricingFormatted = [
            'currency' => $pricing['currency'] ?? 'GBP',
            'subtotal' => (int) ($pricing['subtotal'] ?? 0),
            'discount' => (int) ($pricing['discount'] ?? 0),
            'taxes' => (int) ($pricing['taxes'] ?? 0),
            'fees' => (int) ($pricing['fees'] ?? 0),
            'dogFee' => (int) ($pricing['dogFee'] ?? $pricing['dog_fee'] ?? 0),
            'dog_fee' => (int) ($pricing['dogFee'] ?? $pricing['dog_fee'] ?? 0),
            'dogsCount' => (int) ($pricing['dogsCount'] ?? ($booking->guests['dogs'] ?? 0)),
            'dogDetails' => $dogDetails,
            'extrasFee' => (int) ($pricing['extrasFee'] ?? $pricing['extras_fee'] ?? 0),
            'extras_fee' => (int) ($pricing['extrasFee'] ?? $pricing['extras_fee'] ?? 0),
            'extras' => $extrasList,
            'total' => (int) ($pricing['total'] ?? 0),
            'couponCode' => $pricing['couponCode'] ?? null,
        ];

        $siteSettings = \App\Models\SiteSettings::first();
        $property = $booking->property ?? \App\Models\Property::first();
        $propertyName = $siteSettings?->property_name ?? $property?->name ?? 'Hamptworth Stays';
        $propertyAddress = $siteSettings?->address ?? $property?->address ?? 'Home Farm, Hamptworth, Salisbury SP5 2DU';

        $propertyPayload = [
            'name' => $propertyName,
            'currency' => $pricingFormatted['currency'] ?? $siteSettings?->currency ?? $property?->currency ?? 'GBP',
            'checkInTime' => $siteSettings?->check_in_time ?? $property?->check_in_time ?? '16:00',
            'checkOutTime' => $siteSettings?->check_out_time ?? $property?->check_out_time ?? '10:00',
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $booking->id,
                'bookingNumber' => $booking->booking_number,
                'booking_number' => $booking->booking_number,
                'status' => $booking->status,
                'paymentStatus' => $booking->payment_status,
                'payment_status' => $booking->payment_status,
                'checkIn' => $booking->check_in ? date('Y-m-d', strtotime($booking->check_in)) : null,
                'check_in' => $booking->check_in ? date('Y-m-d', strtotime($booking->check_in)) : null,
                'checkOut' => $booking->check_out ? date('Y-m-d', strtotime($booking->check_out)) : null,
                'check_out' => $booking->check_out ? date('Y-m-d', strtotime($booking->check_out)) : null,
                'guests' => $booking->guests ?? ['adults' => 2, 'children' => 0],
                'guestName' => $guestName,
                'guestEmail' => $contact['email'] ?? $booking->user?->email ?? '',
                'guestPhone' => $contact['phone'] ?? $contact['mobile'] ?? '',
                'propertyName' => $propertyName,
                'propertyAddress' => $propertyAddress,
                'property' => $propertyPayload,
                'pricing' => $pricingFormatted,
                'items' => $items,
                'dogDetails' => $dogDetails,
                'extras' => $extrasList,
                'payments' => $payments,
                'bookedAt' => $formatDateIso($booking->created_at),
            ],
        ]);
    }

    public function createIntent(Request $request)
    {
        $bookingId = $request->input('bookingId') ?? $request->input('booking_id');
        $booking = Booking::where('id', $bookingId)->first();
        if (!$booking) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'BOOKING_NOT_FOUND', 'message' => 'Booking not found'],
            ], 404);
        }

        $paymentService = app(\App\Services\PaymentService::class);
        $result = $paymentService->createIntent($booking);

        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'PAYMENT_INTENT_FAILED', 'message' => $result['error'] ?? 'Failed to create payment intent'],
            ], 500);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'paymentId' => $result['payment_id'] ?? null,
                'clientSecret' => $result['client_secret'] ?? null,
                'client_secret' => $result['client_secret'] ?? null,
                'reused' => $result['reused'] ?? false,
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
