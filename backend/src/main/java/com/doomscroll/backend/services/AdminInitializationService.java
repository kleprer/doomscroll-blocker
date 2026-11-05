
package com.doomscroll.backend.services;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.doomscroll.backend.models.Admin;
import com.doomscroll.backend.repositories.AdminRepository;

@Service
public class AdminInitializationService {

    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminInitializationService(
            AdminRepository adminRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.adminRepository = adminRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public void createInitialAdmin(String username, String password) {

        // Если администратор уже существует — ничего не меняем
        if (adminRepository.count() > 0) {
            return;
        }

        if (username == null || username.isBlank()) {
            throw new IllegalStateException(
                    "ADMIN_INIT_USERNAME must be configured"
            );
        }

        if (password == null || password.length() < 12) {
            throw new IllegalStateException(
                    "ADMIN_INIT_PASSWORD must contain at least 12 characters"
            );
        }

        String passwordHash = passwordEncoder.encode(password);

        Admin admin = new Admin(username, passwordHash);

        adminRepository.save(admin);
    }
}
