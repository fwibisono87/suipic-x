<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import Sun from "carbon-icons-svelte/lib/Sun.svelte";
    import Moon from "carbon-icons-svelte/lib/Moon.svelte";
    import Laptop from "carbon-icons-svelte/lib/Laptop.svelte";

    export let theme: "light" | "dark" | "system" = "system";

    const dispatch = createEventDispatcher<{
        change: "light" | "dark" | "system";
    }>();

    function cycleTheme() {
        const order: Array<"light" | "dark" | "system"> = [
            "light",
            "dark",
            "system",
        ];
        const currentIndex = order.indexOf(theme);
        const nextTheme = order[(currentIndex + 1) % order.length];
        dispatch("change", nextTheme);
    }

    $: icon = theme === "light" ? Sun : theme === "dark" ? Moon : Laptop;
    $: label =
        theme === "light"
            ? "Light mode"
            : theme === "dark"
              ? "Dark mode"
              : "System";
</script>

<button
    class="theme-toggle"
    on:click={cycleTheme}
    aria-label="Toggle theme: {label}"
    title={label}
>
    <svelte:component this={icon} size={20} />
</button>

<style lang="scss">
    .theme-toggle {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        padding: 0;
        background-color: var(--surface-default);
        color: var(--text-secondary);
        border: 1px solid var(--border-default);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s ease-out;

        &:hover {
            background-color: var(--bg-subtle);
            color: var(--text-primary);
            border-color: var(--border-emphasized);
        }

        &:active {
            transform: scale(0.95);
        }
    }
</style>
