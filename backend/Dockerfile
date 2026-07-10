FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B package -DskipTests

# Inclui Chromium e dependências nativas compatíveis com a versão do Playwright usada pelo projeto.
FROM mcr.microsoft.com/playwright/java:v1.44.0-jammy
WORKDIR /app
COPY --from=build /build/target/agents-pool-*.jar app.jar
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
