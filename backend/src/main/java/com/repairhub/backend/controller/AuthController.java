package com.repairhub.backend.controller;

import com.repairhub.backend.Secrecy;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

    @Autowired
    private JdbcTemplate jdbc;

    // Allows new user registration. Customers are auto-approved but technicians require admin approval. Returns user info and display message about approval status.
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String role  = body.get("role");

        if (email == null || body.get("password") == null || body.get("fullName") == null || role == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "email, password, fullName and role are required"));
        }
        if (!role.equals("customer") && !role.equals("technician")) {
            return ResponseEntity.badRequest().body(Map.of("error", "role must be customer or technician"));
        }

        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM users WHERE email = ?", Integer.class, email);
        if (count != null && count > 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email already registered"));
        }

        String status = role.equals("technician") ? "pending" : "active";
        String hash   = Secrecy.hashPassword(body.get("password"));

        jdbc.update(
            "INSERT INTO users (email, password_hash, full_name, phone, role, status) VALUES (?, ?, ?, ?, ?, ?)",
            email, hash, body.get("fullName"), body.getOrDefault("phone", ""), role, status
        );

        Long userId = jdbc.queryForObject("SELECT currval('users_user_id_seq')", Long.class);

        // If technician, create profile row
        if (role.equals("technician")) {
            jdbc.update(
                "INSERT INTO technician_profiles (technician_id, bio, specialization) VALUES (?, ?, ?)",
                userId,
                body.getOrDefault("bio", ""),
                body.getOrDefault("specialization", "")
            );
        }

        Map<String, Object> response = new HashMap<>();
        response.put("userId",   userId);
        response.put("email",    email);
        response.put("fullName", body.get("fullName"));
        response.put("role",     role);
        response.put("status",   status);

        String message = role.equals("technician")
            ? "Registration submitted. Awaiting admin approval."
            : "Registration successful.";
        response.put("message", message);

        return ResponseEntity.ok(response);
    }

    // Allows users to log in. Checks password and account status. Returns user info and error messages for pending/suspended accounts.
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String sql =
            "SELECT user_id, full_name, email, phone, password_hash, role, status " +
            "FROM users WHERE email = ?";

        try {
            Map<String, Object> user = jdbc.queryForMap(sql, body.get("email"));

            if (!Secrecy.checkPassword(body.get("password"), (String) user.get("password_hash"))) {
                return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
            }

            String status = (String) user.get("status");
            if ("pending".equals(status)) {
                return ResponseEntity.status(403).body(
                Map.of("error", "Your account is pending admin approval. Please check back later."));
            }

            String role = (String) user.get("role");
            if ("suspended".equals(status) && !"technician".equals(role)) {
                return ResponseEntity.status(403).body(
                Map.of("error", "Your account has been suspended. Contact support."));
            }

            Map<String, Object> response = new HashMap<>();
            response.put("userId",   user.get("user_id"));
            response.put("fullName", user.get("full_name"));
            response.put("email",    user.get("email"));
            response.put("phone",    user.get("phone"));
            response.put("role",     user.get("role"));
            response.put("status",   user.get("status"));

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        }
    }
}
