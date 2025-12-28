<?php

declare(strict_types=1);

namespace App\Tests\Acceptance;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

class LoginLogoutTest extends WebTestCase
{
    public function testUserCanLoginAndLogout(): void
    {
        $client = static::createClient();
        $container = static::getContainer();

        $entityManager = $container->get(EntityManagerInterface::class);
        $passwordHasher = $container->get(UserPasswordHasherInterface::class);

        $user = new User();
        $user->setEmail('test@example.com');
        $hashedPassword = $passwordHasher->hashPassword($user, 'password123');
        $user->setPassword($hashedPassword);

        $entityManager->persist($user);
        $entityManager->flush();

        $crawler = $client->request('GET', '/login');
        $this->assertResponseIsSuccessful();
        $this->assertSelectorExists('form');

        $form = $crawler->selectButton('Sign in')->form([
            '_username' => 'test@example.com',
            '_password' => 'password123',
        ]);

        $client->submit($form);

        $this->assertResponseRedirects();

        $tokenStorage = $container->get(TokenStorageInterface::class);

        $user = $tokenStorage->getToken()?->getUser();
        $this->assertInstanceOf(User::class, $user);

        $client->request('GET', '/logout');

        $this->assertResponseRedirects();

        $token = $tokenStorage->getToken();
        $this->assertNull($token);
    }
}
