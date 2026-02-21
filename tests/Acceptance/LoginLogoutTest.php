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

    public function testShadowUserCannotLogin(): void
    {
        $client = static::createClient();
        $container = static::getContainer();

        $entityManager = $container->get(EntityManagerInterface::class);

        $shadowUser = new User();
        $shadowUser->setEmail('shadow@example.com');
        $shadowUser->setPassword(null);

        $entityManager->persist($shadowUser);
        $entityManager->flush();

        $crawler = $client->request('GET', '/login');
        $this->assertResponseIsSuccessful();

        $form = $crawler->selectButton('Sign in')->form([
            '_username' => 'shadow@example.com',
            '_password' => 'any-password',
        ]);

        $client->submit($form);
        $this->assertResponseRedirects('/login');

        $client->followRedirect();
        $this->assertResponseIsSuccessful();
        $this->assertSelectorExists('.alert-danger');

        $tokenStorage = $container->get(TokenStorageInterface::class);
        $token = $tokenStorage->getToken();
        $this->assertNull($token);
    }
}
