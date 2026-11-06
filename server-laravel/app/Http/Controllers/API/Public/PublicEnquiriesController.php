<?php

namespace App\Http\Controllers\API\Public;

use App\Http\Controllers\Controller;
use App\Models\Enquiry;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PublicEnquiriesController extends Controller
{
    public function index()
    {
        return response()->json(['success' => true, 'data' => []]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'firstName' => ['nullable', 'string', 'max:80'],
            'first_name' => ['nullable', 'string', 'max:80'],
            'lastName' => ['nullable', 'string', 'max:80'],
            'last_name' => ['nullable', 'string', 'max:80'],
            'email' => ['required', 'email', 'max:160'],
            'telephone' => ['required', 'string', 'max:40'],
            'title' => ['nullable', 'string', 'max:20'],
            'holidayBudget' => ['nullable', 'string', 'max:60'],
            'holiday_budget' => ['nullable', 'string', 'max:60'],
            'partySize' => ['nullable', 'integer'],
            'party_size' => ['nullable', 'integer'],
            'bedrooms' => ['nullable', 'integer'],
            'fromDate' => ['nullable', 'string', 'max:30'],
            'from_date' => ['nullable', 'string', 'max:30'],
            'toDate' => ['nullable', 'string', 'max:30'],
            'to_date' => ['nullable', 'string', 'max:30'],
            'specificLocation' => ['nullable', 'string', 'max:200'],
            'specific_location' => ['nullable', 'string', 'max:200'],
            'dogFriendly' => ['nullable', 'boolean'],
            'dog_friendly' => ['nullable', 'boolean'],
            'details' => ['nullable', 'string'],
            'roomTypeId' => ['nullable', 'string', 'max:24'],
            'room_type_id' => ['nullable', 'string', 'max:24'],
        ]);

        $firstName = $validated['first_name'] ?? $validated['firstName'] ?? 'Guest';
        $lastName = $validated['last_name'] ?? $validated['lastName'] ?? '';

        $enquiry = Enquiry::create([
            'id' => bin2hex(random_bytes(12)),
            'title' => $validated['title'] ?? null,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'email' => $validated['email'],
            'telephone' => $validated['telephone'],
            'holiday_budget' => $validated['holiday_budget'] ?? $validated['holidayBudget'] ?? null,
            'party_size' => $validated['party_size'] ?? $validated['partySize'] ?? null,
            'bedrooms' => $validated['bedrooms'] ?? null,
            'from_date' => $validated['from_date'] ?? $validated['fromDate'] ?? null,
            'to_date' => $validated['to_date'] ?? $validated['toDate'] ?? null,
            'specific_location' => $validated['specific_location'] ?? $validated['specificLocation'] ?? null,
            'dog_friendly' => $validated['dog_friendly'] ?? $validated['dogFriendly'] ?? false,
            'details' => $validated['details'] ?? null,
            'room_type_id' => $validated['room_type_id'] ?? $validated['roomTypeId'] ?? null,
            'status' => 'NEW',
        ]);

        // Dispatch email notification to both guest and admin
        try {
            $notificationService = app(NotificationService::class);

            // Send acknowledgement to guest
            $subject = 'Thank you for your enquiry — Hamptworth Stays';
            $html = '<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">'
                . '<h2>Thank you for your enquiry</h2>'
                . '<p>Dear ' . htmlspecialchars($firstName) . ',</p>'
                . '<p>We have received your enquiry regarding a stay at Hamptworth Stays. Our team will review your requirements and get in touch with you shortly.</p>'
                . ($enquiry->details ? '<blockquote>' . nl2br(htmlspecialchars($enquiry->details)) . '</blockquote>' : '')
                . '<p>Warm wishes,<br>The Hamptworth Stays Team</p>'
                . '</div>';
            $notificationService->sendViaResend($enquiry->email, $subject, $html);

            // Send alert to admin
            $adminEmail = env('ADMIN_NOTIFICATION_EMAIL', 'stay@hamptworthstays.com');
            if ($adminEmail) {
                $adminSubject = 'New enquiry received from ' . $firstName . ' ' . $lastName;
                $adminHtml = '<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">'
                    . '<h2>New Guest Enquiry</h2>'
                    . '<p><strong>Name:</strong> ' . htmlspecialchars($firstName . ' ' . $lastName) . '</p>'
                    . '<p><strong>Email:</strong> ' . htmlspecialchars($enquiry->email) . '</p>'
                    . '<p><strong>Phone:</strong> ' . htmlspecialchars($enquiry->telephone) . '</p>'
                    . '<p><strong>Details:</strong> ' . nl2br(htmlspecialchars($enquiry->details ?? 'None')) . '</p>'
                    . '</div>';
                $notificationService->sendViaResend($adminEmail, $adminSubject, $adminHtml);
            }
        } catch (\Throwable $e) {
            Log::warning('Enquiry email notification failed: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'data' => $enquiry,
        ], 201);
    }
}
