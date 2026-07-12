package com.hrb.agentspool;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableScheduling
@SpringBootApplication
public class AgentsPoolApplication {
    public static void main(String[] args) {
        SpringApplication.run(AgentsPoolApplication.class, args);
    }
}
