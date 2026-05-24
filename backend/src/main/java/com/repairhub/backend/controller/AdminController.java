package com.repairhub.backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "http://localhost:5173")
public class AdminController {

    @Autowired
    private JdbcTemplate jdbc;

    // Returns overall platform stats for admin dashboard
    @GetMapping("/stats")
    public Map<String, Object> getStats() {
        int totalCustomers = orZero(jdbc.queryForObject(
            "SELECT COUNT(*) FROM users WHERE role = 'customer' AND status = 'active'", Integer.class));

        int totalTechnicians = orZero(jdbc.queryForObject(
            "SELECT COUNT(*) FROM users WHERE role = 'technician' AND status = 'active'", Integer.class));

        int pendingApprovals = orZero(jdbc.queryForObject(
            "SELECT COUNT(*) FROM users WHERE role = 'technician' AND status = 'pending'", Integer.class));

        int pendingAppeals = orZero(jdbc.queryForObject(
            "SELECT COUNT(*) FROM appeals WHERE status = 'pending'", Integer.class));

        int activeJobs = orZero(jdbc.queryForObject(
            "SELECT COUNT(*) FROM repair_requests WHERE status IN ('assigned', 'in_progress')", Integer.class));

        int pendingRequests = orZero(jdbc.queryForObject(
            "SELECT COUNT(*) FROM repair_requests WHERE status = 'pending'", Integer.class));

        int completedJobs = orZero(jdbc.queryForObject(
            "SELECT COUNT(*) FROM repair_requests WHERE status = 'completed'", Integer.class));

        Object revenue = jdbc.queryForObject(
            "SELECT COALESCE(SUM(final_amount), 0) FROM technician_assignments WHERE completed_at IS NOT NULL",
            Object.class);

        return Map.of(
            "totalCustomers",   totalCustomers,
            "totalTechnicians", totalTechnicians,
            "pendingApprovals", pendingApprovals,
            "pendingAppeals",   pendingAppeals,
            "activeJobs",       activeJobs,
            "pendingRequests",  pendingRequests,
            "completedJobs",    completedJobs,
            "totalRevenue",     revenue
        );
    }

    // NEW: Requests by category for bar chart
    @GetMapping("/stats/requests-by-category")
    public List<Map<String, Object>> getRequestsByCategory() {
        String sql = 
            "SELECT category, COUNT(*) as total " +
            "FROM repair_requests " +
            "GROUP BY category " +
            "ORDER BY total DESC";
        
        return jdbc.queryForList(sql);
    }

    // NEW: Requests by month for last 6 months (line chart)
    @GetMapping("/stats/requests-by-month")
    public List<Map<String, Object>> getRequestsByMonth() {
        // Get last 6 months including current
        List<Map<String, Object>> result = new ArrayList<>();
        LocalDate today = LocalDate.now();
        DateTimeFormatter monthFormatter = DateTimeFormatter.ofPattern("MMM");
        
        for (int i = 5; i >= 0; i--) {
            LocalDate targetMonth = today.minusMonths(i);
            String monthName = targetMonth.format(monthFormatter);
            String yearMonth = targetMonth.format(DateTimeFormatter.ofPattern("yyyy-MM"));
            
            Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM repair_requests " +
                "WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', ?::date)",
                Integer.class, yearMonth + "-01");
            
            Map<String, Object> entry = new HashMap<>();
            entry.put("month", monthName);
            entry.put("total", orZero(count));
            result.add(entry);
        }
        
        return result;
    }

    // Optional: Get average rating for all technicians (could add to stats)
    @GetMapping("/stats/average-rating")
    public Map<String, Object> getAverageRating() {
        Double avgRating = jdbc.queryForObject(
            "SELECT COALESCE(AVG(rating), 0) FROM technician_profiles WHERE rating > 0",
            Double.class);
        return Map.of("averageRating", avgRating != null ? avgRating : 0.0);
    }

    // Returns list of users with optional filtering by role and status
    @GetMapping("/users")
    public List<Map<String, Object>> getUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status) {

        StringBuilder sql = new StringBuilder(
            "SELECT u.user_id, u.full_name, u.email, u.phone, u.role, u.status, u.created_at, " +
            "       tp.rating, tp.jobs_completed, tp.specialization " +
            "FROM users u " +
            "LEFT JOIN technician_profiles tp ON u.user_id = tp.technician_id " +
            "WHERE u.role != 'admin' "
        );

        if (role != null && !role.isEmpty()) sql.append("AND u.role = '").append(role).append("' ");
        if (status != null && !status.isEmpty()) sql.append("AND u.status = '").append(status).append("' ");
        sql.append("ORDER BY u.created_at DESC");

        return jdbc.queryForList(sql.toString());
    }

    // Update user status (e.g. approve technician, suspend user, etc.)
    @PatchMapping("/users/{userId}/status")
    public ResponseEntity<?> updateUserStatus(
            @PathVariable Long userId,
            @RequestBody Map<String, String> body) {

        String newStatus = body.get("status");
        if (newStatus == null || !List.of("active", "suspended", "pending").contains(newStatus)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid status value"));
        }

        jdbc.update("UPDATE users SET status = ? WHERE user_id = ?", newStatus, userId);
        return ResponseEntity.ok(Map.of("message", "User status updated to " + newStatus));
    }

    @GetMapping("/requests")
    public List<Map<String, Object>> getRequests(
            @RequestParam(required = false) String status) {

        StringBuilder sql = new StringBuilder(
            "SELECT r.request_id, r.category, r.description, r.status, " +
            "       r.address_line1, r.city, r.state, r.postal_code, " +
            "       r.scheduled_date, r.estimated_cost, r.created_at, " +
            "       cu.full_name AS customer_name, cu.email AS customer_email, " +
            "       tu.full_name AS technician_name, " +
            "       ta.assignment_id, ta.assigned_at, ta.final_amount " +
            "FROM repair_requests r " +
            "JOIN users cu ON r.customer_id = cu.user_id " +
            "LEFT JOIN technician_assignments ta ON r.request_id = ta.request_id " +
            "LEFT JOIN users tu ON ta.technician_id = tu.user_id " +
            "WHERE 1=1 "
        );

        if (status != null && !status.isEmpty()) sql.append("AND r.status = '").append(status).append("' ");
        sql.append("ORDER BY r.created_at DESC");

        return jdbc.queryForList(sql.toString());
    }

    // Admin manually assigns a technician to a pending request
    @PostMapping("/requests/{requestId}/assign")
    public ResponseEntity<?> assignTechnician(
            @PathVariable Long requestId,
            @RequestBody Map<String, Object> body) {

        Long technicianId = Long.valueOf(body.get("technicianId").toString());

        // Verify request is still pending
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM repair_requests WHERE request_id = ? AND status = 'pending'",
            Integer.class, requestId);
        if (count == null || count == 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Request not found or already assigned"));
        }

        // Verify technician is active
        Integer techCount = jdbc.queryForObject(
            "SELECT COUNT(*) FROM users WHERE user_id = ? AND role = 'technician' AND status = 'active'",
            Integer.class, technicianId);
        if (techCount == null || techCount == 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Technician not found or not active"));
        }

        jdbc.update(
            "INSERT INTO technician_assignments (request_id, technician_id) VALUES (?, ?)",
            requestId, technicianId
        );

        jdbc.update(
            "UPDATE repair_requests SET status = 'assigned' WHERE request_id = ?",
            requestId
        );

        return ResponseEntity.ok(Map.of("message", "Technician assigned successfully"));
    }

    @GetMapping("/reviews")
    public List<Map<String, Object>> getReviews() {
        String sql =
            "SELECT rv.review_id, rv.rating, rv.comment, rv.created_at, " +
            "       cu.full_name AS customer_name, " +
            "       tu.full_name AS technician_name, " +
            "       r.category " +
            "FROM reviews rv " +
            "JOIN users cu ON rv.customer_id = cu.user_id " +
            "JOIN users tu ON rv.technician_id = tu.user_id " +
            "JOIN repair_requests r ON rv.request_id = r.request_id " +
            "ORDER BY rv.created_at DESC";

        return jdbc.queryForList(sql);
    }

    @GetMapping("/appeals")
    public List<Map<String, Object>> getAppeals() {
        String sql =
            "SELECT a.appeal_id, a.reason, a.status, a.created_at, " +
            "       u.user_id, u.full_name, u.email, u.phone, " +
            "       tp.specialization, tp.rating, tp.jobs_completed " +
            "FROM appeals a " +
            "JOIN users u ON a.user_id = u.user_id " +
            "LEFT JOIN technician_profiles tp ON u.user_id = tp.technician_id " +
            "ORDER BY a.created_at DESC";

        return jdbc.queryForList(sql);
    }

    @PatchMapping("/appeals/{appealId}")
    public ResponseEntity<?> resolveAppeal(
            @PathVariable Long appealId,
            @RequestBody Map<String, String> body) {

        String decision = body.get("decision");
        if (!"approved".equals(decision) && !"rejected".equals(decision)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Decision must be approved or rejected"));
        }

        // Get the appeal
        Map<String, Object> appeal;
        try {
            appeal = jdbc.queryForMap(
                "SELECT user_id FROM appeals WHERE appeal_id = ? AND status = 'pending'", appealId);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Appeal not found or already resolved"));
        }

        // Update appeal status
        jdbc.update("UPDATE appeals SET status = ? WHERE appeal_id = ?", decision, appealId);

        // If approved, reactivate the user
        if ("approved".equals(decision)) {
            jdbc.update("UPDATE users SET status = 'active' WHERE user_id = ?", appeal.get("user_id"));
        }

        return ResponseEntity.ok(Map.of("message", "Appeal " + decision));
    }

    // Helper method to return 0 if null
    private int orZero(Integer val) {
        return val != null ? val : 0;
    }
}