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

struct IndirectArgs {
    vertexCount: u32,
    instanceCount: atomic<u32>,
    firstVertex: u32,
    firstInstance: u32,
}

@group(0) @binding(0) var<uniform> params: SimulationParams;
@group(0) @binding(1) var<storage, read_write> positions: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read_write> velocities: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> indirectArgs: IndirectArgs;
@group(0) @binding(4) var<storage, read_write> visibleIndices: array<u32>;
@group(0) @binding(5) var<storage, read_write> lifeStatus: array<u32>;
@group(0) @binding(6) var<storage, read_write> pickingResult: atomic<u32>;

@compute @workgroup_size(64)
fn simulate(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let index = global_id.x;
    if (index >= arrayLength(&positions)) { return; }
    if (lifeStatus[index] == 0u) { return; }

    var pos = positions[index];
    var vel = velocities[index];

    let dx = pos.x - params.mouseX;
    let dy = pos.y - params.mouseY;
    let distSq = dx*dx + dy*dy;
    
    if (distSq < (params.radius * params.radius)) {
        let force = 0.002;
        vel.x += dx * force;
        vel.y += dy * force;

        if (params.clickState > 0.5) {
            atomicExchange(&pickingResult, index);
        }
    }

    pos.x += vel.x * params.deltaTime;
    pos.y += vel.y * params.deltaTime;

    let aspectRatio = params.screenWidth / params.screenHeight;
    if (pos.x < -aspectRatio || pos.x > aspectRatio) { 
        vel.x = -vel.x; 
        pos.x = clamp(pos.x, -aspectRatio, aspectRatio); 
    }
    if (pos.y < -1.0 || pos.y > 1.0) { 
        vel.y = -vel.y; 
        pos.y = clamp(pos.y, -1.0, 1.0); 
    }

    positions[index] = pos;
    velocities[index] = vel;

    let clipPos = params.viewProjectionMatrix * vec4<f32>(pos.x, pos.y, 0.0, 1.0);
    let inX = clipPos.x >= -clipPos.w * 1.1 && clipPos.x <= clipPos.w * 1.1;
    let inY = clipPos.y >= -clipPos.w * 1.1 && clipPos.y <= clipPos.w * 1.1;

    if (inX && inY) {
        let writeIndex = atomicAdd(&indirectArgs.instanceCount, 1u);
        visibleIndices[writeIndex] = index;
    }
}