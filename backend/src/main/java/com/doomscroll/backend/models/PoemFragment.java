
package com.doomscroll.backend.models;

import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Document(collection = "poem_fragments")
public class PoemFragment {

    @Id
    private UUID id = UUID.randomUUID();

    @Setter
    private String author;

    @Setter
    private String title;

    @Setter
    private String content;

    @Setter
    private String source;

    @Setter
    @Field("is_active")
    private Boolean isActive = true;

    @Field("created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public PoemFragment(
            String author,
            String title,
            String content,
            String source
    ) {
        this.author = author;
        this.title = title;
        this.content = content;
        this.source = source;
    }
}
