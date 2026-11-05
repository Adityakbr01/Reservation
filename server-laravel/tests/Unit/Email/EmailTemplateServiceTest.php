<?php

namespace Tests\Unit\Email;

use App\Services\EmailTemplateService;
use App\Support\Email\EmailRegistry;
use App\Support\Email\Templates\WelcomeTemplates;
use Tests\TestCase;

class EmailTemplateServiceTest extends TestCase
{
    private EmailTemplateService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new EmailTemplateService();
    }

    public function test_dummy_vars_fill_every_required_slot_and_avoid_html_specials(): void
    {
        foreach (EmailRegistry::KEYS as $key) {
            $definition = EmailRegistry::definition($key);
            $vars = EmailRegistry::dummyStringVars($key);
            $this->assertNotEmpty($vars, $key);
            foreach ($definition['requiredVars'] as $name) {
                $this->assertNotSame('', trim($vars[$name] ?? ''), "{$key}.{$name}");
            }
            foreach ($vars as $value) {
                $this->assertDoesNotMatchRegularExpression('/[<>"\']/', $value, $key);
            }
        }
    }

    public function test_unsaved_draft_renders_with_dummy_data(): void
    {
        $rendered = $this->service->renderDraftPreview('WELCOME', [
            'subject' => 'Welcome to Hamptworth Staysqq',
            'htmlBody' => '<p>Hello {{guestName}}, welcome to {{brandName}}!</p>',
            'textBody' => 'Hello {{guestName}}, welcome!',
        ]);

        $this->assertSame('draft', $rendered['source']);
        $this->assertSame('Welcome to Hamptworth Staysqq', $rendered['subject']);
        $this->assertStringContainsString('Alexandra Morgan', $rendered['html']);
        $this->assertStringContainsString('Hamptworth Stays!', $rendered['html']);
        $this->assertStringNotContainsString('{{guestName}}', $rendered['html']);
        $this->assertStringContainsString('Alexandra Morgan', $rendered['text']);
    }

    public function test_empty_draft_fields_fall_back_to_code_default(): void
    {
        $rendered = $this->service->renderDraftPreview('WELCOME', [
            'subject' => '',
            'htmlBody' => '',
            'textBody' => '',
        ]);

        $this->assertSame('Welcome to Hamptworth Stays', $rendered['subject']);
        $this->assertStringContainsString('Alexandra Morgan', $rendered['html']);
    }

    public function test_unknown_draft_variables_are_rejected(): void
    {
        $this->expectExceptionMessage('Unknown variables: hacker');
        $this->service->renderDraftPreview('WELCOME', ['subject' => 'Hi {{hacker}}']);
    }

    public function test_draft_values_are_escaped_and_scripts_stripped(): void
    {
        $rendered = $this->service->renderDraftPreview('CHECKED_OUT', [
            'subject' => 'Thank You for Staying at {{cottageName}}',
            'htmlBody' => '<p>Hi {{guestName}}</p><script>alert(1)</script>',
            'textBody' => 'Hi {{guestName}}',
        ]);

        $this->assertStringNotContainsString('<script>', $rendered['html']);
        $this->assertStringContainsString('Hi Alexandra Morgan', $rendered['html']);
        $this->assertSame('Thank You for Staying at Fern Cottage', $rendered['subject']);
    }

    public function test_disabled_or_missing_override_falls_back_to_default(): void
    {
        $default = $this->service->codeDefaultFor('WELCOME');

        $this->assertSame('default', $this->service->renderWithOverride('WELCOME', [], $default, null)['source']);

        $disabled = [
            'subject' => 'Hi',
            'htmlBody' => '<p>Hi</p>',
            'textBody' => 'Hi',
            'isEnabled' => false,
        ];
        $this->assertSame('default', $this->service->renderWithOverride('WELCOME', [], $default, $disabled)['source']);
    }

    public function test_subject_only_override_keeps_default_body(): void
    {
        $default = $this->service->codeDefaultFor('WELCOME');
        $result = $this->service->renderWithOverride(
            'WELCOME',
            ['guestName' => 'Alex', 'brandName' => 'Hamptworth Stays'],
            $default,
            ['subject' => 'Welcome, {{guestName}}!', 'htmlBody' => '', 'textBody' => '', 'isEnabled' => true]
        );

        $this->assertSame('custom', $result['source']);
        $this->assertSame('Welcome, Alex!', $result['rendered']['subject']);
        $this->assertSame($default['html'], $result['rendered']['html']);
        $this->assertSame($default['text'], $result['rendered']['text']);
    }

    public function test_unknown_override_variables_are_rejected(): void
    {
        $default = $this->service->codeDefaultFor('WELCOME');

        $this->expectExceptionMessage('unknown variables');
        $this->service->renderWithOverride(
            'WELCOME',
            [],
            $default,
            ['subject' => 'Hi {{hacker}}', 'htmlBody' => '', 'textBody' => '', 'isEnabled' => true]
        );
    }

    public function test_fully_blank_override_falls_back_to_default(): void
    {
        $default = $this->service->codeDefaultFor('WELCOME');
        $result = $this->service->renderWithOverride(
            'WELCOME',
            [],
            $default,
            ['subject' => '', 'htmlBody' => '', 'textBody' => '', 'isEnabled' => true]
        );

        $this->assertSame('default', $result['source']);
    }

    public function test_editable_source_restores_placeholders_and_rerenders_identically(): void
    {
        foreach (EmailRegistry::KEYS as $key) {
            $source = $this->service->editableSourceFor($key);
            $this->assertStringNotContainsString('Alexandra Morgan', $source['htmlBody'], $key);
            $this->assertStringNotContainsString('QB-HX7K2P', $source['htmlBody'], $key);
            $this->assertStringNotContainsString('QB-HX7K2P', $source['subject'], $key);

            $redone = $this->service->renderDraftPreview($key, $source);
            $default = $this->service->codeDefaultFor($key);
            $this->assertSame($default['subject'], $redone['subject'], $key);
            $this->assertSame($default['html'], $redone['html'], $key);
            $this->assertSame($default['text'], $redone['text'], $key);
        }
    }
}
