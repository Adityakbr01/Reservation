<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\EmailTemplate;
use App\Services\EmailTemplateService;
use App\Services\NotificationService;
use App\Support\Email\EmailRegistry;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminEmailTemplateController extends Controller
{
    public function index(Request $request)
    {
        $overrides = EmailTemplate::all()->keyBy('key');
        $search = strtolower($request->query('search', ''));
        $category = $request->query('category');
        $status = $request->query('status');

        $templateService = app(EmailTemplateService::class);

        $list = [];
        foreach (EmailRegistry::KEYS as $key) {
            $def = EmailRegistry::definition($key);
            $override = $overrides->get($key);
            $default = $templateService->codeDefaultFor($key);

            $item = [
                'key' => $key,
                'name' => $def['name'],
                'category' => $def['category'],
                'description' => $def['description'],
                'requiredVars' => $def['requiredVars'],
                'optionalVars' => $def['optionalVars'],
                'essential' => $def['essential'],
                'notificationType' => $def['notificationType'],
                'subject' => $override && ! empty($override->subject) ? $override->subject : $default['subject'],
                'isEnabled' => $override ? (bool) $override->is_enabled : true,
                'isCustomized' => (bool) $override,
                'updatedAt' => $override && $override->updated_at ? $override->updated_at->toISOString() : null,
                'updatedBy' => $override ? $override->updated_by : null,
            ];

            if ($category && $category !== 'all' && $item['category'] !== $category) {
                continue;
            }
            if ($status === 'enabled' && ! $item['isEnabled']) {
                continue;
            }
            if ($status === 'disabled' && $item['isEnabled']) {
                continue;
            }
            if ($search !== '' && ! str_contains(strtolower($item['name'] . ' ' . $item['key'] . ' ' . $item['description']), $search)) {
                continue;
            }

            $list[] = $item;
        }

        return response()->json(['success' => true, 'data' => $list]);
    }

    public function show(string $key)
    {
        if (! EmailRegistry::isKey($key)) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'EMAIL_TEMPLATE_NOT_FOUND', 'message' => 'Email template not found'],
            ], 404);
        }

        $def = EmailRegistry::definition($key);
        $override = EmailTemplate::where('key', $key)->first();
        $templateService = app(EmailTemplateService::class);
        $default = $templateService->codeDefaultFor($key);

        $view = [
            'key' => $key,
            'name' => $def['name'],
            'category' => $def['category'],
            'description' => $def['description'],
            'requiredVars' => $def['requiredVars'],
            'optionalVars' => $def['optionalVars'],
            'essential' => $def['essential'],
            'notificationType' => $def['notificationType'],
            'subject' => $override && ! empty($override->subject) ? $override->subject : $default['subject'],
            'isEnabled' => $override ? (bool) $override->is_enabled : true,
            'isCustomized' => (bool) $override,
            'updatedAt' => $override && $override->updated_at ? $override->updated_at->toISOString() : null,
            'updatedBy' => $override ? $override->updated_by : null,
            'htmlBody' => $override ? $override->html_body : null,
            'textBody' => $override ? $override->text_body : null,
            'starter' => $templateService->starterFor($key),
            'editableSource' => $templateService->editableSourceFor($key),
        ];

        return response()->json(['success' => true, 'data' => $view]);
    }

    public function update(Request $request, string $key)
    {
        if (! EmailRegistry::isKey($key)) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'EMAIL_TEMPLATE_NOT_FOUND', 'message' => 'Email template not found'],
            ], 404);
        }

        $user = $request->attributes->get('auth_user');
        $userId = $user ? $user->id : null;

        $template = EmailTemplate::where('key', $key)->first();
        if (! $template) {
            $template = new EmailTemplate();
            $template->id = (string) Str::uuid();
            $template->key = $key;
        }

        if ($request->has('subject')) {
            $template->subject = (string) $request->input('subject');
        }
        if ($request->has('htmlBody')) {
            $template->html_body = (string) $request->input('htmlBody');
        } elseif ($request->has('html_body')) {
            $template->html_body = (string) $request->input('html_body');
        }
        if ($request->has('textBody')) {
            $template->text_body = (string) $request->input('textBody');
        } elseif ($request->has('text_body')) {
            $template->text_body = (string) $request->input('text_body');
        }
        if ($request->has('isEnabled')) {
            $template->is_enabled = (bool) $request->input('isEnabled');
        } elseif ($request->has('is_enabled')) {
            $template->is_enabled = (bool) $request->input('is_enabled');
        }

        $template->updated_by = $userId;
        $template->save();

        return $this->show($key);
    }

    public function preview(string $key)
    {
        if (! EmailRegistry::isKey($key)) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'EMAIL_TEMPLATE_NOT_FOUND', 'message' => 'Email template not found'],
            ], 404);
        }

        $def = EmailRegistry::definition($key);
        $vars = EmailRegistry::dummyStringVars($key);
        $templateService = app(EmailTemplateService::class);
        $default = $templateService->codeDefaultFor($key);
        $override = EmailTemplate::where('key', $key)->first();

        $res = $templateService->renderWithOverride(
            $key,
            $vars,
            $default,
            $override ? $override->toArray() : null
        );

        return response()->json([
            'success' => true,
            'data' => [
                'subject' => $res['rendered']['subject'],
                'html' => $res['rendered']['html'],
                'text' => $res['rendered']['text'],
                'source' => $res['source'],
                'variables' => [
                    'required' => $def['requiredVars'],
                    'optional' => $def['optionalVars'],
                ],
                'dummyVars' => $vars,
            ],
        ]);
    }

    public function draftPreview(Request $request, string $key)
    {
        if (! EmailRegistry::isKey($key)) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'EMAIL_TEMPLATE_NOT_FOUND', 'message' => 'Email template not found'],
            ], 404);
        }

        $templateService = app(EmailTemplateService::class);
        $preview = $templateService->renderDraftPreview($key, $request->all());

        return response()->json([
            'success' => true,
            'data' => array_merge($preview, [
                'dummyVars' => EmailRegistry::dummyStringVars($key),
            ]),
        ]);
    }

    public function test(Request $request, string $key)
    {
        if (! EmailRegistry::isKey($key)) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'EMAIL_TEMPLATE_NOT_FOUND', 'message' => 'Email template not found'],
            ], 404);
        }

        $to = $request->input('to');
        if (! $to || ! filter_var($to, FILTER_VALIDATE_EMAIL)) {
            return response()->json([
                'success' => false,
                'error' => ['code' => 'INVALID_RECIPIENT', 'message' => 'A valid recipient email address is required'],
            ], 422);
        }

        $vars = EmailRegistry::dummyStringVars($key);
        $templateService = app(EmailTemplateService::class);
        $default = $templateService->codeDefaultFor($key);
        $override = EmailTemplate::where('key', $key)->first();

        $res = $templateService->renderWithOverride(
            $key,
            $vars,
            $default,
            $override ? $override->toArray() : null
        );

        $subject = '[TEST] ' . $res['rendered']['subject'];
        $html = $res['rendered']['html'];
        $text = $res['rendered']['text'];

        $notificationService = app(NotificationService::class);
        $providerMessageId = $notificationService->sendViaResend($to, $subject, $html, $text);

        return response()->json([
            'success' => true,
            'data' => [
                'provider' => 'resend',
                'providerMessageId' => $providerMessageId,
            ],
        ]);
    }
}

