<?php

namespace Tests\Unit\Support;

use App\Support\Audit;
use Illuminate\Http\Request;
use PHPUnit\Framework\TestCase;

class AuditTest extends TestCase
{
    private function booking(array $overrides = []): array
    {
        return array_replace([
            'id' => 'b1',
            'bookingNumber' => 'QB-TEST01',
            'userId' => 'u1',
            'status' => 'CANCELLED',
            'paymentStatus' => 'REFUNDED',
            'contact' => ['email' => 'n@example.com', 'phone' => '+91'],
            'notes' => 'private note',
            'pricing' => ['currency' => 'INR', 'total' => 300000],
        ], $overrides);
    }

    public function test_booking_snapshot_carries_statuses_and_money_only(): void
    {
        $this->assertSame([
            'bookingNumber' => 'QB-TEST01',
            'status' => 'CANCELLED',
            'paymentStatus' => 'REFUNDED',
            'total' => 300000,
            'currency' => 'INR',
        ], Audit::bookingSnapshot($this->booking()));
    }

    public function test_snapshot_never_leaks_contact_notes_or_ids(): void
    {
        $raw = json_encode(Audit::bookingSnapshot($this->booking()));

        $this->assertStringNotContainsString('n@example.com', $raw);
        $this->assertStringNotContainsString('+91', $raw);
        $this->assertStringNotContainsString('u1', $raw);
        $this->assertStringNotContainsString('private note', $raw);
    }

    public function test_action_allow_list_covers_audited_flows(): void
    {
        foreach ([
            'BOOKING_CREATED',
            'BOOKING_CANCELLED',
            'BOOKING_CHECKED_IN',
            'BOOKING_CHECKED_OUT',
            'PAYMENT_REFUNDED',
            'CMS_PUBLISHED',
            'SETTINGS_UPDATED',
        ] as $action) {
            $this->assertContains($action, Audit::ACTIONS);
        }
    }

    public function test_prefers_first_forwarded_ip_and_truncates_user_agent(): void
    {
        $request = Request::create('/', 'GET', server: [
            'REMOTE_ADDR' => '127.0.0.1',
            'HTTP_X_FORWARDED_FOR' => '9.9.9.9, 1.1.1.1',
            'HTTP_USER_AGENT' => str_repeat('x', 500),
        ]);
        $request->attributes->set('auth_user', (object) ['id' => 'a1', 'role' => 'admin']);

        $context = Audit::contextFrom($request);

        $this->assertSame('9.9.9.9', $context['ip']);
        $this->assertSame('a1', $context['actorId']);
        $this->assertSame('admin', $context['actorRole']);
        $this->assertLessThanOrEqual(300, strlen($context['userAgent']));
    }

    public function test_anonymous_requests_record_null_actor_with_socket_ip(): void
    {
        $request = Request::create('/', 'GET', server: ['REMOTE_ADDR' => '127.0.0.1']);

        $context = Audit::contextFrom($request);

        $this->assertNull($context['actorId']);
        $this->assertSame('127.0.0.1', $context['ip']);
    }
}
