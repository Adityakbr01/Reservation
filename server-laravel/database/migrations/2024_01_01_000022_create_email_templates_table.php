<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_templates', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('key', 60)->unique();
            $table->string('subject', 160);
            $table->longText('html_body');
            $table->mediumText('text_body');
            $table->boolean('is_enabled')->default(true);
            $table->char('updated_by', 24)->nullable();
            $table->timestamps(3);

            $table->foreign('updated_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_templates');
    }
};
