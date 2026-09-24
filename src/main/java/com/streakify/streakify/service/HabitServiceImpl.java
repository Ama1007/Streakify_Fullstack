package com.streakify.streakify.service;

import com.streakify.streakify.entity.Habit;
import com.streakify.streakify.entity.User;
import com.streakify.streakify.repository.HabitRepository;
import com.streakify.streakify.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class HabitServiceImpl implements HabitService {

    private final HabitRepository habitRepository;
    private final UserRepository userRepository;

    public HabitServiceImpl(HabitRepository habitRepository,
                            UserRepository userRepository) {
        this.habitRepository = habitRepository;
        this.userRepository = userRepository;
    }

    @Override
    public Habit createHabit(Long userId, Habit habit) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (habit.getTargetDaysPerWeek() < 1 || habit.getTargetDaysPerWeek() > 7) {
            throw new RuntimeException("Target days must be between 1 and 7");
        }

        habit.setUser(user);
        habit.setCreatedAt(LocalDateTime.now());

        return habitRepository.save(habit);
    }

    @Override
    public List<Habit> getHabitsByUser(Long userId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return habitRepository.findByUser(user);
    }

    @Override
    public void deleteHabit(Long habitId) {

        if (!habitRepository.existsById(habitId)) {
            throw new RuntimeException("Habit not found");
        }

        habitRepository.deleteById(habitId);
    }
}