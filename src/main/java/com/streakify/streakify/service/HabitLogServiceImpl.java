package com.streakify.streakify.service;

import com.streakify.streakify.entity.Habit;
import com.streakify.streakify.entity.HabitLog;
import com.streakify.streakify.exception.DuplicateLogException;
import com.streakify.streakify.exception.HabitNotFoundException;
import com.streakify.streakify.repository.HabitLogRepository;
import com.streakify.streakify.repository.HabitRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

@Service
@Transactional
public class HabitLogServiceImpl implements HabitLogService {

    private final HabitRepository habitRepository;
    private final HabitLogRepository habitLogRepository;

    public HabitLogServiceImpl(HabitRepository habitRepository,
                               HabitLogRepository habitLogRepository) {
        this.habitRepository = habitRepository;
        this.habitLogRepository = habitLogRepository;
    }

    @Override
    public HabitLog logHabit(Long habitId, LocalDate date, boolean completed) {

        Habit habit = habitRepository.findById(habitId)
                .orElseThrow(() -> new HabitNotFoundException("Habit not found"));

        LocalDate maxAllowedDate = LocalDate.now().plusDays(1);
        if (date.isAfter(maxAllowedDate)) {
            throw new RuntimeException("Cannot log future date");
        }

        Optional<HabitLog> existing = habitLogRepository.findByHabitAndLogDate(habit, date);
        if (existing.isPresent()) {
            HabitLog log = existing.get();
            log.setCompleted(completed);
            return habitLogRepository.save(log);
        }

        HabitLog log = HabitLog.builder()
                .habit(habit)
                .logDate(date)
                .completed(completed)
                .build();

        return habitLogRepository.save(log);
    }

    @Override
    public HabitLog updateLog(Long habitId, LocalDate date, boolean completed) {

        Habit habit = habitRepository.findById(habitId)
                .orElseThrow(() -> new HabitNotFoundException("Habit not found"));

        LocalDate maxAllowedDate = LocalDate.now().plusDays(1);
        if (date.isAfter(maxAllowedDate)) {
            throw new RuntimeException("Cannot log future date");
        }

        Optional<HabitLog> existing = habitLogRepository.findByHabitAndLogDate(habit, date);
        if (existing.isPresent()) {
            HabitLog log = existing.get();
            log.setCompleted(completed);
            return habitLogRepository.save(log);
        }

        HabitLog log = HabitLog.builder()
                .habit(habit)
                .logDate(date)
                .completed(completed)
                .build();

        return habitLogRepository.save(log);
    }

    @Override
    public List<HabitLog> getLogs(Long habitId) {

        Habit habit = habitRepository.findById(habitId)
                .orElseThrow(() -> new HabitNotFoundException("Habit not found"));

        return habitLogRepository.findByHabitOrderByLogDateAsc(habit);
    }

    @Override
    public Map<String, Object> calculateStreak(Long habitId) {

        List<HabitLog> logs = habitLogRepository
                .findByHabitIdOrderByLogDateAsc(habitId);

        int currentStreak = 0;
        int longestStreak = 0;

        // Collect all completed distinct dates
        Set<LocalDate> completedDates = new HashSet<>();
        for (HabitLog l : logs) {
            if (l.isCompleted()) {
                completedDates.add(l.getLogDate());
            }
        }

        // 1. LONGEST STREAK
        List<LocalDate> sortedDates = completedDates.stream().sorted().toList();
        int tempStreak = 0;
        LocalDate prev = null;
        for (LocalDate d : sortedDates) {
            if (prev == null || d.equals(prev.plusDays(1))) {
                tempStreak = (prev == null) ? 1 : tempStreak + 1;
            } else {
                tempStreak = 1;
            }
            prev = d;
            longestStreak = Math.max(longestStreak, tempStreak);
        }

        // 2. CURRENT STREAK
        // Find latest completed date
        LocalDate latestCompleted = sortedDates.isEmpty() ? null : sortedDates.get(sortedDates.size() - 1);
        if (latestCompleted != null) {
            LocalDate serverToday = LocalDate.now();
            long daysFromToday = java.time.temporal.ChronoUnit.DAYS.between(latestCompleted, serverToday);

            // Active streak if latest is:
            // -1: client today in forward timezone (e.g. IST +5:30)
            //  0: server today
            //  1: yesterday (today is still in progress, streak is maintained!)
            if (daysFromToday >= -1 && daysFromToday <= 1) {
                LocalDate checkDate = latestCompleted;
                while (completedDates.contains(checkDate)) {
                    currentStreak++;
                    checkDate = checkDate.minusDays(1);
                }
            }
        }

        longestStreak = Math.max(longestStreak, currentStreak);

        Map<String, Object> result = new HashMap<>();
        result.put("habitId", habitId);
        result.put("currentStreak", currentStreak);
        result.put("longestStreak", longestStreak);

        return result;
    }
}