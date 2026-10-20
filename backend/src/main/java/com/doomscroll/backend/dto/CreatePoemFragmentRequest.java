package com.doomscroll.backend.dto;

import jakarta.validation.constraints.NotBlank;


public record CreatePoemFragmentRequest(

    @NotBlank
    String author,

    @NotBlank
    String title,

    @NotBlank
    String content,

    @NotBlank
    String source

) {}