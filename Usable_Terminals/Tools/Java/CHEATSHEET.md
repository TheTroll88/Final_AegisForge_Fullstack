# Java (JDK/JRE) — Cheat Sheet

> **Primary:** `C:\Program Files\Microsoft\jdk-25.0.2.10-hotspot\bin\java.exe` (OpenJDK 25, on PATH)  
> **Also installed:** JRE 1.8.0_461 (Oracle), JRE 11.0.28.6 (Adoptium)  
> **Compiler:** `javac` (JDK 25 only)  
> **Type:** Runtime + development kit  
> **AegisForge Role:** Running Java-based tools, potential enterprise integrations

---

## Running Java

```bash
# Run compiled class
java MyApp                                 # Run MyApp.class
java -cp . MyApp                           # With classpath
java -cp lib/*:. MyApp                     # With library jars (Linux/bash)
java -cp "lib/*;." MyApp                   # With library jars (Windows)

# Run JAR files
java -jar application.jar                  # Run executable JAR
java -jar application.jar --port=8080      # With arguments

# Version check
java -version                              # Which Java is active
java -XshowSettings:all 2>&1 | head -20   # All JVM settings
```

---

## Compiling (JDK 25)

```bash
# Compile
javac MyApp.java                           # Compile single file
javac -d out src/*.java                    # Compile to output directory
javac -cp lib/* src/*.java                 # With dependencies

# Compile + run
javac MyApp.java && java MyApp

# Single-file source launch (Java 11+)
java MyApp.java                            # Compile + run in one step (single file only)
```

---

## jshell (Java REPL — JDK 25)

```bash
jshell                                     # Start interactive Java shell
```

```java
// Inside jshell:
jshell> int x = 42
jshell> System.out.println("Hello " + x)
jshell> var list = List.of(1, 2, 3, 4, 5)
jshell> list.stream().filter(n -> n > 2).forEach(System.out::println)
jshell> /exit                              // Exit
jshell> /help                              // Help
jshell> /list                              // Show all snippets
jshell> /vars                              // Show variables
jshell> /methods                           // Show methods
```

---

## Switching Java Versions

```powershell
# Check what's active
java -version

# Temporarily use different version (PowerShell)
$env:JAVA_HOME = "C:\Program Files\Java\jre1.8.0_461"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
java -version   # Now Java 8

$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jre-11.0.28.6-hotspot"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
java -version   # Now Java 11

$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-25.0.2.10-hotspot"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
java -version   # Back to JDK 25

# Permanent (set JAVA_HOME system env var)
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Microsoft\jdk-25.0.2.10-hotspot", "User")
```

---

## Build Tools

### Gradle

```bash
# If gradlew exists in project
./gradlew build                            # Build project
./gradlew test                             # Run tests
./gradlew run                              # Run application
./gradlew clean                            # Clean build files
./gradlew tasks                            # List available tasks
./gradlew dependencies                     # Show dependency tree
```

### Maven

```bash
# If mvnw exists in project
./mvnw compile                             # Compile
./mvnw test                                # Run tests
./mvnw package                             # Build JAR/WAR
./mvnw clean install                       # Clean + build + install to local repo
./mvnw dependency:tree                     # Dependency tree
```

---

## JDK Tools (JDK 25)

```bash
# Available in JDK 25:
jshell                      # Interactive REPL
javac                       # Compiler
javadoc                     # Documentation generator
jar                         # Archive tool (create/extract JARs)
jlink                       # Custom runtime image builder
jpackage                    # Native installer creator
keytool                     # Certificate/key management
jconsole                    # JVM monitoring GUI
jstack PID                  # Thread dump of running Java process
jmap -histo PID             # Memory histogram
jps                         # List Java processes
jcmd PID VM.info            # JVM diagnostics
```

---

## Installed Versions Summary

| Version | Type | Path | Use For |
|---|---|---|---|
| JDK 25 | Full JDK (compile + run) | `C:\Program Files\Microsoft\jdk-25.0.2.10-hotspot` | **Primary** — development, modern apps |
| JRE 11 | Runtime only | `C:\Program Files\Eclipse Adoptium\jre-11.0.28.6-hotspot` | Apps requiring Java 11 |
| JRE 8 | Runtime only | `C:\Program Files\Java\jre1.8.0_461` | Legacy apps requiring Java 8 |
