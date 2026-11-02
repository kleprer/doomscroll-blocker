package com.doomscroll.backend.models;

import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Document(collection = "admins")
public class Admin {
    
    @Id
    private UUID id = UUID.randomUUID();

    @Indexed(unique = true)
    private String username; 

    private String passwordHash;

    private boolean enabled = true;

    private Instant createdAt = Instant.now();

    public Admin(String username, String passwordHash) {
        this.username = username;
        this.passwordHash = passwordHash;

    }

     public void disable() {
        this.enabled = false;
    }

    public void enable() {
        this.enabled = true;
    }

    public void changePassword(String passwordHash) {
        this.passwordHash = passwordHash;
    }
}
