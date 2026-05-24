package com.repairhub.backend;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class Secrecy {

    private static final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    // Hash password
    public static String hashPassword(String password) {
        return encoder.encode(password);
    }

    // Verify password
    public static boolean checkPassword(String rawPassword, String hashedPassword) {
        return encoder.matches(rawPassword, hashedPassword);
    }
}