package com.streakify.streakify.config;

import com.streakify.streakify.entity.User;
import com.streakify.streakify.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;

@Configuration
public class DataInitializer {

    @Bean
    public CommandLineRunner initDatabase(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            // Seed default admin if missing
            if (userRepository.findByEmail("admin@streakify.com").isEmpty()) {
                User admin = User.builder()
                        .name("System Admin")
                        .email("admin@streakify.com")
                        .password(passwordEncoder.encode("admin123"))
                        .role("ROLE_ADMIN")
                        .active(true)
                        .createdAt(LocalDateTime.now())
                        .build();
                userRepository.save(admin);
            }

            // Ensure any existing user without a role is marked ROLE_USER
            userRepository.findAll().forEach(u -> {
                boolean changed = false;
                if (u.getRole() == null || u.getRole().isBlank()) {
                    u.setRole("ROLE_USER");
                    changed = true;
                }
                if (u.getActive() == null) {
                    u.setActive(true);
                    changed = true;
                }
                if (changed) {
                    userRepository.save(u);
                }
            });
        };
    }
}
