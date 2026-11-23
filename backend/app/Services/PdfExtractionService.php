<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Log;
use Smalot\PdfParser\Config;
use Smalot\PdfParser\Parser;

class PdfExtractionService
{
    /**
     * Extract clean readable text from a PDF file.
     * Processes pages individually and frees memory between pages for
     * large (200+) page PDFs without running out of memory.
     *
     * @param string $filePath Absolute path to PDF file
     * @return string Extracted text
     * @throws Exception
     */
    public function extractText(string $filePath): string
    {
        if (!file_exists($filePath)) {
            throw new Exception("PDF file not found at path: {$filePath}");
        }

        @set_time_limit(0);

        try {
            // Build a memory-efficient parser config:
            // - Discard raw image data to reduce memory usage for image-heavy PDFs
            $config = new Config();
            $config->setRetainImageContent(false);

            $parser = new Parser([], $config);
            $pdf = $parser->parseFile($filePath);
            $pages = $pdf->getPages();

            if (empty($pages)) {
                throw new Exception("The uploaded PDF does not contain any readable pages.");
            }

            $extractedText = '';
            $pageIndex = 1;
            $totalPages = count($pages);

            Log::info("PDF extraction started", [
                'path'        => $filePath,
                'total_pages' => $totalPages,
                'memory_mb'   => round(memory_get_usage(true) / 1024 / 1024, 1),
            ]);

            foreach ($pages as $page) {
                @set_time_limit(0); // Reset timeout per page for large files

                try {
                    $pageText = $page->getText();
                    $cleanedPageText = $this->cleanText($pageText);

                    if (!empty(trim($cleanedPageText))) {
                        $extractedText .= "\n--- Page {$pageIndex} ---\n" . $cleanedPageText . "\n";
                    }

                    // Release page reference immediately after text is extracted
                    unset($pageText, $cleanedPageText);

                } catch (Exception $pageEx) {
                    // Log page error but continue extracting remaining pages
                    Log::warning("PDF page {$pageIndex} extraction failed (skipping): " . $pageEx->getMessage(), [
                        'path' => $filePath,
                        'page' => $pageIndex,
                    ]);
                }

                $pageIndex++;

                // Periodically run GC and log progress for very large PDFs
                if ($pageIndex % 50 === 0) {
                    gc_collect_cycles();
                    Log::info("PDF extraction progress", [
                        'page'      => $pageIndex,
                        'total'     => $totalPages,
                        'memory_mb' => round(memory_get_usage(true) / 1024 / 1024, 1),
                    ]);
                }
            }

            // Free the entire parsed PDF document from memory
            unset($pdf, $pages, $parser);
            gc_collect_cycles();

            $extractedText = trim($extractedText);

            // Scanned PDF detection: if total extracted text is negligible across multiple pages
            if (strlen($extractedText) < 50) {
                throw new Exception(
                    "This PDF contains scanned images or insufficient readable text. " .
                    "OCR is required for scanned documents."
                );
            }

            Log::info("PDF extraction completed", [
                'path'           => $filePath,
                'total_pages'    => $totalPages,
                'extracted_chars' => strlen($extractedText),
                'memory_mb'      => round(memory_get_usage(true) / 1024 / 1024, 1),
            ]);

            return $extractedText;

        } catch (Exception $e) {
            Log::error("PDF Extraction error: " . $e->getMessage(), ['path' => $filePath]);
            throw $e;
        }
    }

    /**
     * Clean and normalize raw extracted text.
     */
    protected function cleanText(string $text): string
    {
        // Replace non-printable control characters except line breaks & tabs
        $text = preg_replace('/[^\PC\s]/u', '', $text);

        // Normalize Windows/Mac line endings to \n
        $text = str_replace(["\r\n", "\r"], "\n", $text);

        // Normalize multiple horizontal spaces
        $text = preg_replace('/[ \t]+/', ' ', $text);

        // Normalize excessive consecutive line breaks to max 2
        $text = preg_replace('/\n{3,}/', "\n\n", $text);

        return trim($text);
    }
}
