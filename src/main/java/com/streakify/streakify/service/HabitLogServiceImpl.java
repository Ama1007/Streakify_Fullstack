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

        if (date.isAfter(LocalDate.now())) {
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

        if (date.isAfter(LocalDate.now())) {
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
        int tempStreak = 0;

        LocalDate previousDate = null;

        // LONGEST STREAK
        for (HabitLog log : logs) {

            if (!log.isCompleted()) continue;

            if (previousDate == null) {
                tempStreak = 1;
            } else if (log.getLogDate().equals(previousDate.plusDays(1))) {
                tempStreak++;
            } else {
                tempStreak = 1;
            }

            previousDate = log.getLogDate();
            longestStreak = Math.max(longestStreak, tempStreak);
        }

        // CURRENT STREAK
        Collections.reverse(logs);

        LocalDate today = LocalDate.now();

        for (HabitLog log : logs) {
            if (!log.isCompleted()) break;

            if (log.getLogDate().equals(today.minusDays(currentStreak))) {
                currentStreak++;
            } else {
                break;
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("habitId", habitId);
        result.put("currentStreak", currentStreak);
        result.put("longestStreak", longestStreak);

        return result;
    }
}