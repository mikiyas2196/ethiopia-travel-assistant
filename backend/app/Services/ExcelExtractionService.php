<?php

namespace App\Services;

use Exception;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ExcelExtractionService
{
    /**
     * Extract structured content from Excel or CSV spreadsheets into readable textual format.
     *
     * @param string $filePath Absolute path to spreadsheet file
     * @param string $fileType 'xlsx', 'xls', or 'csv'
     * @return string Structured readable textual content
     * @throws Exception
     */
    public function extractText(string $filePath, string $fileType = 'xlsx'): string
    {
        if (!file_exists($filePath)) {
            throw new Exception("Spreadsheet file not found at path: {$filePath}");
        }

        @set_time_limit(300);
        @ini_set('memory_limit', '1024M');

        try {
            $reader = IOFactory::createReaderForFile($filePath);
            $reader->setReadDataOnly(true);
            $reader->setReadEmptyCells(false);
            $spreadsheet = $reader->load($filePath);
            $sheetCount = $spreadsheet->getSheetCount();

            if ($sheetCount === 0) {
                throw new Exception("The spreadsheet contains no worksheets.");
            }

            $output = '';

            for ($i = 0; $i < $sheetCount; $i++) {
                $sheet = $spreadsheet->getSheet($i);
                $sheetTitle = trim($sheet->getTitle());
                $rows = $sheet->toArray(null, true, true, false);

                if (empty($rows)) {
                    continue;
                }

                // Find header row (first non-empty row)
                $headers = [];
                $headerRowIndex = null;

                foreach ($rows as $rowIndex => $row) {
                    $nonEmptyCells = array_filter($row, fn($c) => $c !== null && trim((string)$c) !== '');
                    if (count($nonEmptyCells) >= 1) {
                        $headers = array_map(fn($c) => trim((string)$c), $row);
                        $headerRowIndex = $rowIndex;
                        break;
                    }
                }

                if ($headerRowIndex === null || empty($headers)) {
                    continue;
                }

                $sheetContent = '';
                $recordNumber = 1;

                // Process data rows
                for ($r = $headerRowIndex + 1; $r < count($rows); $r++) {
                    $row = $rows[$r];
                    $rowData = [];
                    $hasContent = false;

                    foreach ($row as $colIndex => $cellValue) {
                        $header = $headers[$colIndex] ?? ('Field ' . ($colIndex + 1));
                        $header = trim($header);
                        $value = trim((string)$cellValue);

                        if ($header !== '' && $value !== '') {
                            $hasContent = true;
                            $rowData[] = "{$header}: {$value}";
                        }
                    }

                    if ($hasContent) {
                        $sheetContent .= "--- Record {$recordNumber} ---\n" . implode("\n", $rowData) . "\n\n";
                        $recordNumber++;
                    }
                }

                if (!empty(trim($sheetContent))) {
                    $output .= "=== Sheet: {$sheetTitle} ===\n\n" . $sheetContent . "\n";
                }
            }

            $output = trim($output);

            if (empty($output)) {
                throw new Exception("The spreadsheet appears to be empty or contains no readable rows.");
            }

            return $output;

        } catch (Exception $e) {
            Log::error("Excel/CSV Extraction error: " . $e->getMessage(), ['path' => $filePath]);
            throw $e;
        }
    }
}
