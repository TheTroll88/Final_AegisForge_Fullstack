# Reverse Engineering Lab
# Source: C:\Users\natha\v4w_website\Reverse-Engineering

## OVERVIEW
Complete Windows reverse engineering training lab with source, compiled binaries
(x86 + x64, debug builds with PDB symbols), IDA Pro databases, and hardware schematics.
From the mytechnotalent/Reverse-Engineering repo — 153+ lessons across x86, x64, ARM, AVR, RISC-V.

## WIN32 API CHAIN (file system primitives)

### 0x0001-hello_world-x64 — MessageBox (x64 Assembly)
- Source: main.asm (MASM x64, hand-written)
- APIs: MessageBoxA(), PostQuitMessage()
- Technique: shadow stack (sub rsp, 20h), register-based calling convention
- Binaries: .exe + .i64 (IDA Pro database — pre-analyzed disassembly)
- Architecture: x64 only

### 0x0006-directories — Directory Create/Remove
- Source: main.c
- APIs: CreateDirectory(), RemoveDirectory(), GetLastError()
- Target: C:\mydir
- Binaries: Debug/ (x86) + x64/ (x64)

### 0x0007-copyfile — File Copy
- Source: main.c
- APIs: CopyFile(), GetLastError()
- Targets: C:\temp\test1.txt → C:\temp\test2.txt
- Binaries: Debug/ (x86) + x64/ (x64)

### 0x0010-movefile — File Move/Rename
- Source: main.c
- APIs: MoveFile(), GetLastError()
- Binaries: Debug/ (x86) + x64/ (x64)

### 0x0011-createfile — File Handle Creation
- Source: main.c
- APIs: CreateFile(), CloseHandle(), GetLastError()
- Flags: GENERIC_READ | GENERIC_WRITE, FILE_SHARE_READ, CREATE_NEW
- Binaries: Debug/ (x86) + x64/ (x64)

### 0x0012-writefile — File Write
- Source: 0x0012-writefile.c
- APIs: CreateFile(), WriteFile(), CloseHandle()
- Payload: "Reversing is my life!"
- Target: C:\temp\test.txt
- Binaries: Debug/ (x86 .exe + .pdb + .ilk) + x64/
- Debug symbols: vc143.pdb present (full symbol info for disassembly)

### 0x0013-readfile — File Read
- Source: main.c
- APIs: CreateFile(), WriteFile(), ReadFile(), CloseHandle()
- Payload: "Reversing is sexy."
- Full read/write cycle with byte count tracking
- Binaries: Debug/ (x86 .exe + .pdb) + x64/

## COMPLETE API COVERAGE (in order)
```
CreateDirectory()    → Create a directory
RemoveDirectory()    → Delete a directory
CopyFile()           → Copy a file
MoveFile()           → Move/rename a file
CreateFile()         → Open/create file handle (GENERIC_READ|WRITE)
WriteFile()          → Write bytes to file handle
ReadFile()           → Read bytes from file handle
CloseHandle()        → Close file handle
MessageBoxA()        → Display message box (user32.dll)
PostQuitMessage()    → Post WM_QUIT to thread
GetLastError()       → Get last Win32 error code
```

## BUILD ARTIFACTS
All projects include:
- Visual Studio solution files (.sln, .vcxproj)
- Debug builds with full PDB symbols (vc143.pdb)
- Both x86 (Debug/) and x64 (x64/) output
- The PDB files enable full symbolic debugging and disassembly mapping

## IDA PRO DATABASES
- 0x0001-hello_world-x64 Debug/0x0001-hello_world-x64.exe.i64
  → Pre-analyzed IDA database with function names, cross-references, and offset mapping

## HARDWARE SCHEMATICS (Fritzing)
- static RE schematic.fzz / .png — Static analysis circuit
- dynamic RE schematic.fzz / .png — Dynamic analysis circuit
- oled and button schematic.fzz / .png — I/O interface (OLED display + button control)

## DOCUMENTATION
- reversing-for-everyone.pdf — Full training manual
- DC540 Angels Of Death.png — DefCon 540 group reference
- K Background.png, REDAH.png — Visual assets

## LINKED RESOURCES (from README.md)
- Turbo Scanner: github.com/mytechnotalent/turbo-scanner (network scanning)
- Turbo Attack: github.com/mytechnotalent/turbo-attack (attack framework)
- Hacking Windows: github.com/mytechnotalent/Hacking-Windows
- Windows Kernel Debugging: github.com/mytechnotalent/windows-kernel-debugging
- Core Dump RE: github.com/mytechnotalent/Core-Dump-RE (MAC/Linux)
- 10 CTF challenges (DC540 series): MicroPython, C, Assembler, Windows, Unknown formats
