package com.streakify.streakify.controller;

import com.streakify.streakify.entity.Habit;
import com.streakify.streakify.repository.HabitRepository;
import com.streakify.streakify.service.HabitLogService;
import com.streakify.streakify.service.HabitService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping
public class HabitController {

    private final HabitService habitService;
    private final HabitRepository habitRepository;
    private final HabitLogService habitLogService;

    public HabitController(HabitService habitService,
                           HabitRepository habitRepository,
                           HabitLogService habitLogService) {
        this.habitService = habitService;
        this.habitRepository = habitRepository;
        this.habitLogService = habitLogService;
    }

    @GetMapping("/habits/leaderboard")
    public ResponseEntity<List<Map<String, Object>>> getLeaderboard() {
        List<Habit> habits = habitRepository.findAll();
        List<Map<String, Object>> leaderboard = new ArrayList<>();

        for (Habit h : habits) {
            if (h.getUser() != null && (h.getUser().getActive() == null || h.getUser().getActive())) {
                Map<String, Object> streak = habitLogService.calculateStreak(h.getId());
                int currentStreak = (int) streak.getOrDefault("currentStreak", 0);
                int longestStreak = (int) streak.getOrDefault("longestStreak", 0);

                Map<String, Object> entry = new HashMap<>();
                entry.put("habitId", h.getId());
                entry.put("habitName", h.getName());
                entry.put("userName", h.getUser().getName());
                entry.put("currentStreak", currentStreak);
                entry.put("longestStreak", longestStreak);
                leaderboard.add(entry);
            }
        }

        // Sort descending by currentStreak, then longestStreak
        leaderboard.sort((a, b) -> {
            int cmp = Integer.compare((int) b.get("currentStreak"), (int) a.get("currentStreak"));
            if (cmp != 0) return cmp;
            return Integer.compare((int) b.get("longestStreak"), (int) a.get("longestStreak"));
        });

        // Limit to top 20
        if (leaderboard.size() > 20) {
            leaderboard = leaderboard.subList(0, 20);
        }

        return ResponseEntity.ok(leaderboard);
    }

    @PostMapping("/habits")
    public ResponseEntity<Habit> createHabit(@RequestParam Long userId,
                                             @RequestBody Habit habit) {
        return ResponseEntity.ok(habitService.createHabit(userId, habit));
    }

    @GetMapping("/users/{userId}/habits")
    public ResponseEntity<List<Habit>> getHabits(@PathVariable Long userId) {
        return ResponseEntity.ok(habitService.getHabitsByUser(userId));
    }

    @DeleteMapping("/habits/{habitId}")
    public ResponseEntity<String> deleteHabit(@PathVariable Long habitId) {
        habitService.deleteHabit(habitId);
        return ResponseEntity.ok("Habit deleted successfully");
    }
}