<?php

namespace Tests\Unit\Support;

use App\Support\MediaFolders;
use PHPUnit\Framework\TestCase;

class MediaFoldersTest extends TestCase
{
    public function test_builds_nested_paths_like_cottage_oakwood_cottage(): void
    {
        $this->assertSame(
            'Cottage/Oakwood Cottage',
            MediaFolders::normalizeFolderPath('Cottage/Oakwood Cottage')
        );
    }

    public function test_trims_collapses_spaces_and_drops_empty_or_traversal_segments(): void
    {
        $this->assertSame(
            'Cottage/Oakwood Cottage',
            MediaFolders::normalizeFolderPath('  Cottage // Oakwood   Cottage  ')
        );
        $this->assertSame('Cottage/Other', MediaFolders::normalizeFolderPath('Cottage/../Other'));
    }

    public function test_caps_depth_and_segment_length_and_nulls_blanks(): void
    {
        $this->assertSame('a/b/c', MediaFolders::normalizeFolderPath('a/b/c/d'));
        $this->assertSame(str_repeat('x', 60), MediaFolders::normalizeFolderPath(str_repeat('x', 120)));
        $this->assertNull(MediaFolders::normalizeFolderPath(''));
        $this->assertNull(MediaFolders::normalizeFolderPath(null));
    }

    public function test_exact_paths_and_root_match(): void
    {
        $this->assertSame('Cottage/Oakwood Cottage', MediaFolders::folderQuery('Cottage/Oakwood Cottage'));
        $this->assertNull(MediaFolders::folderQuery('__root__'));
    }

    public function test_trailing_glob_matches_subtree_with_escaped_prefix(): void
    {
        $this->assertSame(['$regex' => '^Cottage/'], MediaFolders::folderQuery('Cottage/*'));
        $this->assertSame(['$regex' => '^A\\+B/'], MediaFolders::folderQuery('A+B/*'));
    }
}
