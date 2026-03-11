package com.streakify.streakify.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "habits")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Habit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private int targetDaysPerWeek;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "habit", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<HabitLog> logs;
}