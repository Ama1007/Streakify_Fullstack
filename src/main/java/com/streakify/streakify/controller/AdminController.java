package com.streakify.streakify.controller;

import com.streakify.streakify.entity.Habit;
import com.streakify.streakify.entity.User;
import com.streakify.streakify.repository.HabitRepository;
import com.streakify.streakify.repository.UserRepository;
import com.streakify.streakify.service.HabitLogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/admin")
public class AdminController {

    private final UserRepository userRepository;
    private final HabitRepository habitRepository;
    private final HabitLogService habitLogService;

    public AdminController(UserRepository userRepository,
                           HabitRepository habitRepository,
                           HabitLogService habitLogService) {
        this.userRepository = userRepository;
        this.habitRepository = habitRepository;
        this.habitLogService = habitLogService;
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        long totalUsers = userRepository.count();
        long totalHabits = habitRepository.count();

        List<Habit> allHabits = habitRepository.findAll();
        long activeStreaksCount = 0;
        int highestStreak = 0;

        for (Habit habit : allHabits) {
            Map<String, Object> streak = habitLogService.calculateStreak(habit.getId());
            int currentStreak = streak.get("currentStreak") instanceof Number n ? n.intValue() : 0;
            int longestStreak = streak.get("longestStreak") instanceof Number n ? n.intValue() : 0;
            if (currentStreak > 0) activeStreaksCount++;
            if (longestStreak > highestStreak) highestStreak = longestStreak;
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", totalUsers);
        stats.put("totalHabits", totalHabits);
        stats.put("activeStreaks", activeStreaksCount);
        stats.put("highestStreak", highestStreak);

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/users")
    public ResponseEntity<List<Map<String, Object>>> getAllUsersWithStats() {
        List<User> users = userRepository.findAll();
        List<Map<String, Object>> response = new ArrayList<>();

        for (User user : users) {
            Map<String, Object> userMap = new HashMap<>();
            userMap.put("id", user.getId());
            userMap.put("name", user.getName());
            userMap.put("email", user.getEmail());
            userMap.put("role", user.getRole());
            userMap.put("active", user.getActive() == null || user.getActive());
            userMap.put("createdAt", user.getCreatedAt());

            List<Habit> habits = user.getHabits() != null ? user.getHabits() : Collections.emptyList();
            userMap.put("habitCount", habits.size());

            int userMaxCurrentStreak = 0;
            int userMaxLongestStreak = 0;
            List<Map<String, Object>> habitsWithStreaks = new ArrayList<>();

            for (Habit h : habits) {
                Map<String, Object> streakInfo = habitLogService.calculateStreak(h.getId());
                int currentStreak = streakInfo.get("currentStreak") instanceof Number n ? n.intValue() : 0;
                int longestStreak = streakInfo.get("longestStreak") instanceof Number n ? n.intValue() : 0;

                if (currentStreak > userMaxCurrentStreak) userMaxCurrentStreak = currentStreak;
                if (longestStreak > userMaxLongestStreak) userMaxLongestStreak = longestStreak;

                Map<String, Object> habitSummary = new HashMap<>();
                habitSummary.put("id", h.getId());
                habitSummary.put("name", h.getName());
                habitSummary.put("targetDaysPerWeek", h.getTargetDaysPerWeek());
                habitSummary.put("currentStreak", currentStreak);
                habitSummary.put("longestStreak", longestStreak);
                habitsWithStreaks.add(habitSummary);
            }

            userMap.put("currentStreak", userMaxCurrentStreak);
            userMap.put("longestStreak", userMaxLongestStreak);
            userMap.put("habits", habitsWithStreaks);

            response.add(userMap);
        }

        return ResponseEntity.ok(response);
    }

    @PutMapping("/users/{userId}/toggle-status")
    public ResponseEntity<?> toggleUserStatus(@PathVariable Long userId) {
        Optional<User> optionalUser = userRepository.findById(userId);
        if (optionalUser.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = optionalUser.get();
        boolean newStatus = !(user.getActive() == null || user.getActive());
        user.setActive(newStatus);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "id", user.getId(),
                "active", newStatus,
                "message", "User status updated to " + (newStatus ? "Active" : "Deactivated")
        ));
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<?> deleteUser(@PathVariable Long userId) {
        if (!userRepository.existsById(userId)) {
            return ResponseEntity.notFound().build();
        }
        userRepository.deleteById(userId);
        return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
    }
}
