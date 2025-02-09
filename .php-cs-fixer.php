<?php

$finder = (new PhpCsFixer\Finder())
    ->in('src')
;

return (new PhpCsFixer\Config())
	->setRiskyAllowed(true)
    ->setRules([
        '@Symfony' => true,
		'declare_strict_types' => true,
    ])
    ->setFinder($finder)
;
