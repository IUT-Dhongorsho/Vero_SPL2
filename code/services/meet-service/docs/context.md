# WebRTC Architecture & Implementation Summary

This document outlines the key architectural decisions and underlying logic for the `meet-service`.

### 1. Architecture: SFU (Selective Forwarding Unit) over P2P Mesh
*   **The Decision:** We are building an SFU.
*   **The Logic:** A P2P mesh requires every user to upload their video to every other user in the room. For a team meeting of 5-10 people, this exponentially increases the required upload bandwidth, causing average laptops and residential internet to choke. An SFU requires clients to upload their video exactly **once** to your server, which then distributes it. This is the industry standard (Google Meet, Discord, Zoom) for scalable, high-clarity team calls.

### 2. Tech Stack: Mediasoup + Socket.io
*   **The Decision:** Use **Mediasoup** for the WebRTC engine, paired with **Socket.io** for signaling.
*   **The Logic:** While you can use raw `node-webrtc`, building a production-ready SFU from scratch requires writing incredibly complex logic for bandwidth estimation, packet loss recovery, and simulcast. Mediasoup handles all of this under the hood using an ultra-optimized C++ engine, while exposing a clean, easy-to-use Node.js API for the backend.

### 3. Hardware Capacity: i7-10610U & 16GB RAM
*   **The Decision:** The HP EliteBook 840 G7 is highly capable of running this server. 
*   **The Logic:** Mediasoup scales by mapping one C++ `Worker` process to one CPU core. Running 4 workers on a mobile i7 processor can conservatively handle around 1,000 simultaneous video consumers. This translates to comfortably hosting roughly **10 simultaneous 10-person meetings**. The 16GB of RAM is massive overkill, as the SFU engine is extremely memory efficient.

### 4. Local Network Routing
*   **The Decision:** WebRTC will automatically keep local traffic on the local network. No custom routing algorithms (like OSPF/Dijkstra) are needed.
*   **The Logic:** WebRTC uses the **ICE (Interactive Connectivity Establishment)** protocol. If the server laptop and the clients are on the same office LAN, ICE will test and prioritize their local IP addresses (Host candidates). As long as the server is on the same network, the heavy video traffic will be routed purely through the local office switch/router, completely bypassing the wider internet. 

### 5. Server Connectivity: Ethernet over Wi-Fi
*   **The Decision:** Purchase a **Gigabit USB-C (Thunderbolt 3) to Ethernet Adapter** for the server laptop.
*   **The Logic:** Even though the laptop has fast Wi-Fi and 18-36 Mbps of throughput is easily achievable over the air, Wi-Fi is **half-duplex** (cannot send and receive simultaneously) and prone to interference. Because WebRTC relies on **UDP** (which drops delayed packets instead of resending them), any Wi-Fi jitter will instantly result in robotic audio or frozen frames. Wiring the server provides a dedicated, full-duplex connection that ensures the pristine, "Discord-like" clarity needed.
