<?php

declare(strict_types=1);

namespace App\Services\Splitwise;

use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;

class UnsupportedSplitwiseExportException extends UnprocessableEntityHttpException
{
    public function __construct()
    {
        parent::__construct('The file is not a supported Splitwise export.');
    }
}
