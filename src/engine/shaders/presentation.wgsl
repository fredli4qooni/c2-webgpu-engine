struct SimulationParams {
    viewProjectionMatrix: mat4x4<f32>, 
    deltaTime: f32,
    screenWidth: f32,
    screenHeight: f32,
    padding: f32,
    mouseX: f32,
    mouseY: f32,
    radius: f32,
    clickState: f32,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
    @location(1) highlight: f32,
    @location(2) @interpolate(flat) textureIndex: u32,
}

@group(0) @binding(0) var<uniform> params: SimulationParams;
@group(0) @binding(1) var<storage, read> positions: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read> visibleIndices: array<u32>;
@group(0) @binding(3) var<storage, read> unitTypes: array<u32>;

@group(0) @binding(4) var myTexture: texture_2d_array<f32>; 
@group(0) @binding(5) var mySampler: sampler;

@vertex
fn vs_main(
    @builtin(vertex_index) vertexIndex: u32,
    @builtin(instance_index) instanceIndex: u32
) -> VertexOutput {
    let particleRealIndex = visibleIndices[instanceIndex];
    let particlePos = positions[particleRealIndex];
    let unitType = unitTypes[particleRealIndex]; 
    
    var uv = vec2<f32>(0.0, 0.0);
    var posOffset = vec2<f32>(0.0, 0.0);
    
    switch (vertexIndex) {
        case 0u: { posOffset = vec2<f32>(-1.0,  1.0); uv = vec2<f32>(0.0, 0.0); }
        case 1u: { posOffset = vec2<f32>(-1.0, -1.0); uv = vec2<f32>(0.0, 1.0); }
        case 2u: { posOffset = vec2<f32>( 1.0,  1.0); uv = vec2<f32>(1.0, 0.0); }
        case 3u: { posOffset = vec2<f32>( 1.0,  1.0); uv = vec2<f32>(1.0, 0.0); }
        case 4u: { posOffset = vec2<f32>(-1.0, -1.0); uv = vec2<f32>(0.0, 1.0); }
        case 5u: { posOffset = vec2<f32>( 1.0, -1.0); uv = vec2<f32>(1.0, 1.0); }
        default: { posOffset = vec2<f32>(0.0, 0.0);   uv = vec2<f32>(0.0, 0.0); }
    }

    var size = 0.01;
    let dx = particlePos.x - params.mouseX;
    let dy = particlePos.y - params.mouseY;
    let dist = sqrt(dx*dx + dy*dy);

    var highlight = 0.0;
    if (dist < params.radius) {
        size = 0.015; 
        highlight = 1.0;
    }

    let finalVertexPos = posOffset * size;
    
    let worldPos = vec4<f32>(
        particlePos.x + finalVertexPos.x, 
        particlePos.y + finalVertexPos.y, 
        0.0, 
        1.0
    );
    
    var output: VertexOutput;
    output.position = params.viewProjectionMatrix * worldPos;
    output.uv = uv;
    output.highlight = highlight;
    output.textureIndex = unitType; 
    
    return output;
}

@fragment
fn fs_main(
    @location(0) uv: vec2<f32>, 
    @location(1) highlight: f32,
    @location(2) @interpolate(flat) textureIndex: u32
) -> @location(0) vec4<f32> {
    
    var texColor = textureSample(myTexture, mySampler, uv, i32(textureIndex));
    
    if (highlight > 0.5) {
        texColor = mix(texColor, vec4<f32>(1.0, 1.0, 1.0, 1.0), 0.5);
    }
    
    if (texColor.a < 0.5) {
        discard;
    }

    return texColor;
}