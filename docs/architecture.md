# Inua Decision Pipeline

```mermaid
graph TD
    A((User Input)) --> B{Two-Stage Safety Guardrail}
    
    %% Safety Layers
    B --> B1[1. Fast-Path: Keyword Filter]
    B --> B2[2. Fallback: LLM Intent Classifier]
    
    B1 & B2 -- Crisis Detected --> C[Emergency Override: Help Resources]
    B1 & B2 -- Safe / Metaphorical --> D[Context Injection Engine]
    
    %% Context Data
    D --> E{Decision Constraints}
    E -->|Time of Day| F[Circadian Prioritization]
    E -->|Pregnancy Mode| G[Physical Safety Layer]
    
    %% The Smart Adaptation Part
    F & G --> H[Technique Adaptation & Normalization]
    subgraph Adaptation_Process [Real-time Modification]
        H --> H1[Strip Unsafe Phases: e.g. Breath-holds]
        H --> H2[Recalculate Flow & Timing]
    end
    
    %% Agent Final Output
    Adaptation_Process --> I[Inua Intervention Agent]
    I --> J[Personalized Safe Guidance]
    
    %% Observation
    I -.-> K((Opik Tracing & Evaluation))
```
