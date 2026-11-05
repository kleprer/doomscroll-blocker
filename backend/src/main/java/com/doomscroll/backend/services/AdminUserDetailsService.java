package com.doomscroll.backend.services;

import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.doomscroll.backend.models.Admin;
import com.doomscroll.backend.repositories.AdminRepository;

@Service 
public class AdminUserDetailsService implements UserDetailsService {

    private final AdminRepository adminRepository;

    
    public AdminUserDetailsService(AdminRepository adminRepository){
        this.adminRepository = adminRepository;
    }


    @Override
    public UserDetails loadUserByUsername(String username)
            throws UsernameNotFoundException {

        Admin admin = adminRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "Invalid username or password"
                ));

        return User.withUsername(admin.getUsername())
                .password(admin.getPasswordHash())
                .roles("ADMIN")
                .disabled(!admin.isEnabled())
                .build();
    }
}