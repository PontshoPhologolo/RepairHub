package com.repairhub.backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/customer")
@CrossOrigin(origins = "http://localhost:5173")
public class CustomerController {

    @Autowired
    private JdbcTemplate jdbc;

    
    // Returns all repair requests for this customer, with assignment + technician info
    @GetMapping("/{customerId}/requests")
    public List<Map<String, Object>> getRequests(@PathVariable Long customerId) {
        String sql =
            "SELECT r.request_id, r.category, r.description, r.status, " +
            "       r.address_line1, r.city, r.state, r.postal_code, " +
            "       r.scheduled_date, r.estimated_cost, r.created_at, " +
            "       ta.technician_id, " +
            "       u.full_name  AS technician_name, " +
            "       tp.rating    AS technician_rating, " +
            "       ta.final_amount, ta.started_at, ta.completed_at " +
            "FROM repair_requests r " +
            "LEFT JOIN technician_assignments ta ON r.request_id = ta.request_id " +
            "LEFT JOIN users u  ON ta.technician_id = u.user_id " +
            "LEFT JOIN technician_profiles tp ON ta.technician_id = tp.technician_id " +
            "WHERE r.customer_id = ? " +
            "ORDER BY r.created_at DESC";

        return jdbc.queryForList(sql, customerId);
    }

    // Cutomer creates new repair request. Status defaults to 'pending' and admin will assign technician later.
    @PostMapping("/{customerId}/requests")
    public ResponseEntity<?> createRequest(
            @PathVariable Long customerId,
            @RequestBody Map<String, Object> body) {

        if (body.get("category") == null || body.get("description") == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "category and description are required"));
        }

        jdbc.update(
            "INSERT INTO repair_requests " +
            "(customer_id, category, description, address_line1, city, state, postal_code, scheduled_date, estimated_cost) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?::date, ?::numeric)",
            customerId,
            body.get("category"),
            body.get("description"),
            body.get("addressLine1"),
            body.get("city"),
            body.get("state"),
            body.get("postalCode"),
            body.get("scheduledDate"),
            body.get("estimatedCost")
        );

        return ResponseEntity.ok(Map.of("message", "Request created successfully"));
    }

   
    // Customer submits review for completed request. Can only submit review once per request.
    @PostMapping("/{customerId}/reviews")
    public ResponseEntity<?> submitReview(
            @PathVariable Long customerId,
            @RequestBody Map<String, Object> body) {

        Long requestId    = Long.valueOf(body.get("requestId").toString());
        Long technicianId = Long.valueOf(body.get("technicianId").toString());
        int  rating       = Integer.parseInt(body.get("rating").toString());

        // Verify request is completed and belongs to customer
        Integer count = jdbc.queryForObject(
            "SELECT COUNT(*) FROM repair_requests WHERE request_id = ? AND customer_id = ? AND status = 'completed'",
            Integer.class, requestId, customerId);
        if (count == null || count == 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Request not found or not yet completed"));
        }

        // Check no existing review
        Integer existing = jdbc.queryForObject(
            "SELECT COUNT(*) FROM reviews WHERE request_id = ?", Integer.class, requestId);
        if (existing != null && existing > 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Review already submitted"));
        }

        jdbc.update(
            "INSERT INTO reviews (request_id, customer_id, technician_id, rating, comment) VALUES (?, ?, ?, ?, ?)",
            requestId, customerId, technicianId, rating, body.get("comment")
        );

        // Recalculate technician average rating
        jdbc.update(
            "UPDATE technician_profiles SET " +
            "  rating = (SELECT AVG(rating) FROM reviews WHERE technician_id = ?), " +
            "  jobs_completed = (SELECT COUNT(*) FROM reviews WHERE technician_id = ?) " +
            "WHERE technician_id = ?",
            technicianId, technicianId, technicianId
        );

        return ResponseEntity.ok(Map.of("message", "Review submitted"));
    }

    @PatchMapping("/{customerId}/requests/{requestId}/cancel")
    public ResponseEntity<?> cancelRequest(
            @PathVariable Long customerId,
            @PathVariable Long requestId) {
 
        int updated = jdbc.update(
            "UPDATE repair_requests SET status = 'cancelled' " +
            "WHERE request_id = ? AND customer_id = ? AND status = 'pending'",
            requestId, customerId
        );
 
        if (updated == 0) {
            return ResponseEntity.badRequest().body(
                Map.of("error", "Request cannot be cancelled — it may already be assigned or completed"));
        }
 
        return ResponseEntity.ok(Map.of("message", "Request cancelled"));
    }
}
