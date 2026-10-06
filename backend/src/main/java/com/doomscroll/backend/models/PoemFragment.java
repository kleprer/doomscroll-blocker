package com.doomscroll.backend.models;

import java.time.LocalDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity 
@Table(name = "poem_fragments")
@Getter
public class PoemFragment {
    @Id 
    @GeneratedValue (strategy = GenerationType.UUID)
    private UUID id;

    @Setter 
    @Column(name = "author", nullable = false, length = 255)
    private String author;

    @Setter 
    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Setter 
    @Column(name = "content", columnDefinition = "TEXT", nullable = false)
    private String content;

    @Setter 
    @Column(name = "source", nullable = false, length = 255)
    private String source;

    @Setter 
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private final LocalDateTime createdAt = LocalDateTime.now();


    public PoemFragment(String author, String title, String content, String source){
        this.author = author;
        this.title = title;
        this.content = content;
        this.source = source;
        
    }

    
}
