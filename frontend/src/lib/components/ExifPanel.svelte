<script lang="ts">
    import ChevronDown from "carbon-icons-svelte/lib/ChevronDown.svelte";
    import ChevronUp from "carbon-icons-svelte/lib/ChevronUp.svelte";

    export let data: Record<string, unknown> | null = null;
    export let expanded: boolean = false;

    function toggle() {
        expanded = !expanded;
    }

    // Format EXIF entries nicely
    function formatValue(value: unknown): string {
        if (value === null || value === undefined) return "—";
        if (typeof value === "boolean") return value ? "Yes" : "No";
        if (typeof value === "number") {
            // Format decimal numbers nicely
            if (Number.isInteger(value)) return value.toString();
            return value.toFixed(2);
        }
        return String(value);
    }

    // Common EXIF labels
    const labels: Record<string, string> = {
        width: "Width",
        height: "Height",
        format: "Format",
        space: "Color Space",
        density: "DPI",
        hasAlpha: "Has Alpha",
        orientation: "Orientation",
        hasIccProfile: "ICC Profile",
    };

    $: entries = data
        ? Object.entries(data).filter(([_, v]) => v !== null && v !== undefined)
        : [];
</script>

{#if data && entries.length > 0}
    <div class="exif-panel">
        <button class="exif-toggle" on:click={toggle} aria-expanded={expanded}>
            <span>EXIF Data</span>
            <svelte:component
                this={expanded ? ChevronUp : ChevronDown}
                size={18}
            />
        </button>

        {#if expanded}
            <div class="exif-content animate-slide-down">
                <dl class="exif-list">
                    {#each entries as [key, value]}
                        <div class="exif-item">
                            <dt>{labels[key] || key}</dt>
                            <dd>{formatValue(value)}</dd>
                        </div>
                    {/each}
                </dl>
            </div>
        {/if}
    </div>
{/if}

<style lang="scss">
    .exif-panel {
        border: 1px solid var(--border-default);
        border-radius: 12px;
        overflow: hidden;
    }

    .exif-toggle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 0.75rem 1rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--text-secondary);
        background-color: var(--surface-default);
        border: none;
        cursor: pointer;
        transition: all 0.15s ease-out;

        &:hover {
            background-color: var(--bg-subtle);
            color: var(--text-primary);
        }
    }

    .exif-content {
        padding: 1rem;
        background-color: var(--bg-subtle);
        border-top: 1px solid var(--border-muted);
    }

    .exif-list {
        display: grid;
        gap: 0.5rem;
        margin: 0;
    }

    .exif-item {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        font-size: 0.8125rem;

        dt {
            color: var(--text-muted);
        }

        dd {
            margin: 0;
            color: var(--text-primary);
            font-family: var(--font-mono);
        }
    }
</style>
