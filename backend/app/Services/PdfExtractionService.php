<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Log;
use Smalot\PdfParser\Parser;

class PdfExtractionService
{
    protected Parser $parser;

    public function __construct()
    {
        $this->parser = new Parser();
    }

    /**
     * Extract clean readable text from a PDF file.
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

        try {
            $pdf = $this->parser->parseFile($filePath);
            $pages = $pdf->getPages();

            if (empty($pages)) {
                throw new Exception("The uploaded PDF does not contain any readable pages.");
            }

            $extractedText = '';
            $pageIndex = 1;

            foreach ($pages as $page) {
                $pageText = $page->getText();
                $cleanedPageText = $this->cleanText($pageText);

                if (!empty(trim($cleanedPageText))) {
                    $extractedText .= "\n--- Page {$pageIndex} ---\n" . $cleanedPageText . "\n";
                }
                $pageIndex++;
            }

            $extractedText = trim($extractedText);

            // Scanned PDF detection: if total extracted text is negligible across multiple pages
            if (strlen($extractedText) < 50) {
                throw new Exception("This PDF contains scanned images or insufficient readable text. OCR is required for scanned documents.");
            }

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
