package com.repairhub.backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/technician")
@CrossOrigin(origins = "http://localhost:5173")
public class TechnicianController {

    @Autowired
    private JdbcTemplate jdbc;

  
    // Returns all jobs assigned to this technician
    @GetMapping("/{technicianId}/jobs")
    public List<Map<String, Object>> getJobs(@PathVariable Long technicianId) {
        String sql =
            "SELECT r.request_id, r.category, r.description, r.status, " +
            "       r.address_line1, r.city, r.state, r.postal_code, " +
            "       r.scheduled_date, r.estimated_cost, " +
            "       u.full_name AS customer_name, u.phone AS customer_phone, " +
            "       ta.assignment_id, ta.assigned_at, ta.started_at, ta.completed_at, ta.final_amount " +
            "FROM technician_assignments ta " +
            "JOIN repair_requests r ON ta.request_id = r.request_id " +
            "JOIN users u ON r.customer_id = u.user_id " +
            "WHERE ta.technician_id = ? " +
            "ORDER BY ta.assigned_at DESC";

        return jdbc.queryForList(sql, technicianId);
    }

   //Returns list of available jobs (repair requests with status 'pending') that technicians can view and request to be assigned to.
  
    @GetMapping("/available-jobs")
    public List<Map<String, Object>> getAvailableJobs() {
        String sql =
            "SELECT r.request_id, r.category, r.description, " +
            "       r.address_line1, r.city, r.state, r.postal_code, " +
            "       r.scheduled_date, r.estimated_cost, r.created_at, " +
            "       u.full_name AS customer_name " +
            "FROM repair_requests r " +
            "JOIN users u ON r.customer_id = u.user_id " +
            "WHERE r.status = 'pending' " +
            "ORDER BY r.created_at ASC";

        return jdbc.queryForList(sql);
    }

   
    // Technician starts a job they were assigned
    @PostMapping("/{technicianId}/start/{assignmentId}")
    public ResponseEntity<?> startJob(
            @PathVariable Long technicianId,
            @PathVariable Long assignmentId) {

        int updated = jdbc.update(
            "UPDATE technician_assignments SET started_at = NOW() " +
            "WHERE assignment_id = ? AND technician_id = ? AND started_at IS NULL",
            assignmentId, technicianId
        );

        if (updated == 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Assignment not found or already started"));
        }

        // Update request status
        jdbc.update(
            "UPDATE repair_requests SET status = 'in_progress' " +
            "WHERE request_id = (SELECT request_id FROM technician_assignments WHERE assignment_id = ?)",
            assignmentId
        );

        return ResponseEntity.ok(Map.of("message", "Job started"));
    }

   // Technician marks job as completed with final amount and optional notes. Updates request status to 'completed'.
    @PostMapping("/{technicianId}/complete/{assignmentId}")
    public ResponseEntity<?> completeJob(
            @PathVariable Long technicianId,
            @PathVariable Long assignmentId,
            @RequestBody Map<String, Object> body) {

        int updated = jdbc.update(
            "UPDATE technician_assignments SET completed_at = NOW(), final_amount = ?, notes = ? " +
            "WHERE assignment_id = ? AND technician_id = ? AND started_at IS NOT NULL AND completed_at IS NULL",
            body.get("finalAmount"), body.get("notes"), assignmentId, technicianId
        );

        if (updated == 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Assignment not found or not yet started"));
        }

        // Mark request completed
        jdbc.update(
            "UPDATE repair_requests SET status = 'completed' " +
            "WHERE request_id = (SELECT request_id FROM technician_assignments WHERE assignment_id = ?)",
            assignmentId
        );

        return ResponseEntity.ok(Map.of("message", "Job completed"));
    }

     @GetMapping("/{technicianId}/reviews")
    public ResponseEntity<?> getReviews(@PathVariable Long technicianId) {
        Map<String, Object> profile = jdbc.queryForMap(
            "SELECT rating, jobs_completed, specialization, bio " +
            "FROM technician_profiles WHERE technician_id = ?",
            technicianId
        );

        List<Map<String, Object>> reviews = jdbc.queryForList(
            "SELECT rv.rating, rv.comment, rv.created_at, " +
            "       u.full_name AS customer_name " +
            "FROM reviews rv " +
            "JOIN users u ON rv.customer_id = u.user_id " +
            "WHERE rv.technician_id = ? " +
            "ORDER BY rv.created_at DESC",
            technicianId
        );

        return ResponseEntity.ok(Map.of(
            "rating",         profile.get("rating"),
            "jobsCompleted",  profile.get("jobs_completed"),
            "specialization", profile.get("specialization"),
            "bio",            profile.get("bio"),
            "reviews",        reviews
        ));
    }

    @PostMapping("/{technicianId}/appeal")
    public ResponseEntity<?> submitAppeal(
            @PathVariable Long technicianId,
            @RequestBody Map<String, String> body) {

        if (body.get("reason") == null || body.get("reason").isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Reason is required"));
        }

        // Verify technician is actually suspended
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM users WHERE user_id = ? AND status = 'suspended'",
            Integer.class, technicianId
        );
        if (count == null || count == 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Account is not suspended"));
        }

        // Check no existing pending appeal
        Integer existing = jdbc.queryForObject(
            "SELECT COUNT(*) FROM appeals WHERE user_id = ? AND status = 'pending'",
            Integer.class, technicianId
        );
        if (existing != null && existing > 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "You already have a pending appeal"));
        }

        jdbc.update(
            "INSERT INTO appeals (user_id, reason) VALUES (?, ?)",
            technicianId, body.get("reason")
        );

        return ResponseEntity.ok(Map.of("message", "Appeal submitted successfully"));
    }
}
