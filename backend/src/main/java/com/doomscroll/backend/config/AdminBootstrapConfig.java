
package com.doomscroll.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.doomscroll.backend.services.AdminInitializationService;

@Configuration
public class AdminBootstrapConfig {

    @Bean
    public ApplicationRunner initializeAdmin(
            AdminInitializationService initializationService,
            @Value("${admin.init.username:}") String username,
            @Value("${admin.init.password:}") String password
    ) {
        return args -> initializationService.createInitialAdmin(
                username,
                password
        );
    }
}
