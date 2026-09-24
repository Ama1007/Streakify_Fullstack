package com.streakify.streakify.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "habit_logs",
        uniqueConstraints = @UniqueConstraint(columnNames = {"habit_id", "log_date"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HabitLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "habit_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"logs", "user"})
    private Habit habit;

    @Column(name = "log_date", nullable = false)
    private LocalDate logDate;

    private boolean completed;
}