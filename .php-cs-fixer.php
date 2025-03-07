<?php

$finder = (new PhpCsFixer\Finder())
    ->in(['src', 'tests'])
;

return (new PhpCsFixer\Config())
	->setRiskyAllowed(true)
    ->setRules([
        '@Symfony' => true,
		'declare_strict_types' => true,
    ])
    ->setFinder($finder)
;
