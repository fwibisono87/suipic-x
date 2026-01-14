<script lang="ts">
    import Camera from "carbon-icons-svelte/lib/Camera.svelte";
    import ArrowRight from "carbon-icons-svelte/lib/ArrowRight.svelte";
</script>

<svelte:head>
    <title>Suipic - Photo Proofing for Photographers</title>
    <meta
        name="description"
        content="Send early proofs to clients and gather feedback before editing"
    />
</svelte:head>

<div class="landing">
    <section class="hero">
        <div class="hero-content animate-fade-in">
            <div class="hero-icon">
                <Camera size={48} />
            </div>
            <h1>
                <span class="gradient-text">SUIPIC</span>
            </h1>
            <p class="hero-subtitle">Photo proofing, simplified.</p>
            <p class="hero-description">
                Share your rushes with clients. Get feedback before you edit. No
                more endless email threads or WeTransfer links.
            </p>
            <div class="hero-actions">
                <a href="/login" class="btn-primary">
                    Get Started
                    <ArrowRight size={18} />
                </a>
                <a href="/demo" class="btn-secondary"> View Demo </a>
            </div>
        </div>

        <div class="hero-visual animate-slide-up">
            <div class="visual-card glass-card">
                <div class="visual-grid">
                    {#each Array(6) as _, i}
                        <div
                            class="visual-item"
                            style="animation-delay: {i * 100}ms"
                        >
                            <div class="visual-placeholder"></div>
                        </div>
                    {/each}
                </div>
                <div class="visual-overlay">
                    <span class="badge badge-success">12 Picks</span>
                    <span class="badge badge-error">3 Rejects</span>
                    <span class="badge badge-primary">★ 4.2 avg</span>
                </div>
            </div>
        </div>
    </section>

    <section class="features">
        <h2>How it works</h2>
        <div class="feature-grid">
            <div class="feature-card card">
                <div class="feature-number">01</div>
                <h3>Upload Rushes</h3>
                <p>
                    Drop your raw selects. We compress to WebP
                    automatically—originals never leave your machine.
                </p>
            </div>
            <div class="feature-card card">
                <div class="feature-number">02</div>
                <h3>Share with Clients</h3>
                <p>
                    Invite clients to view albums. They see proofs, not finals.
                    Protected from downloads.
                </p>
            </div>
            <div class="feature-card card">
                <div class="feature-number">03</div>
                <h3>Gather Feedback</h3>
                <p>
                    Clients rate, pick, reject, and comment. You get a summary
                    to guide your edits.
                </p>
            </div>
        </div>
    </section>
</div>

<style lang="scss">
    .landing {
        max-width: 1200px;
        margin: 0 auto;
    }

    .hero {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4rem;
        align-items: center;
        padding: 4rem 0;

        @media (max-width: 900px) {
            grid-template-columns: 1fr;
            text-align: center;
        }
    }

    .hero-content {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;

        @media (max-width: 900px) {
            align-items: center;
        }
    }

    .hero-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 80px;
        height: 80px;
        background: linear-gradient(
            135deg,
            var(--primary-600) 0%,
            var(--accent-600) 100%
        );
        color: white;
        border-radius: 24px;
        box-shadow: 0 8px 32px -8px var(--primary-500);
    }

    .hero h1 {
        font-size: 4rem;
        letter-spacing: 0.15em;
        margin: 0;

        @media (max-width: 600px) {
            font-size: 2.5rem;
        }
    }

    .hero-subtitle {
        font-size: 1.5rem;
        color: var(--text-secondary);
        margin: 0;
    }

    .hero-description {
        font-size: 1.125rem;
        color: var(--text-muted);
        max-width: 440px;
        line-height: 1.7;
    }

    .hero-actions {
        display: flex;
        gap: 1rem;
        margin-top: 1rem;

        @media (max-width: 600px) {
            flex-direction: column;
            width: 100%;
        }
    }

    .hero-visual {
        perspective: 1000px;

        @media (max-width: 900px) {
            display: none;
        }
    }

    .visual-card {
        padding: 2rem;
        transform: rotateY(-5deg) rotateX(5deg);
        transform-style: preserve-3d;
        transition: transform 0.3s ease-out;

        &:hover {
            transform: rotateY(0deg) rotateX(0deg);
        }
    }

    .visual-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.75rem;
        margin-bottom: 1.5rem;
    }

    .visual-item {
        animation: fadeIn 0.5s ease-out both;
    }

    .visual-placeholder {
        aspect-ratio: 4/3;
        background: linear-gradient(
            135deg,
            var(--bg-muted) 0%,
            var(--bg-emphasized) 100%
        );
        border-radius: 8px;
    }

    .visual-overlay {
        display: flex;
        gap: 0.75rem;
        justify-content: center;
    }

    .features {
        padding: 4rem 0;
        text-align: center;

        h2 {
            margin-bottom: 3rem;
            color: var(--text-primary);
        }
    }

    .feature-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 2rem;

        @media (max-width: 900px) {
            grid-template-columns: 1fr;
        }
    }

    .feature-card {
        text-align: left;

        h3 {
            margin: 1rem 0 0.75rem;
            font-size: 1.25rem;
        }

        p {
            color: var(--text-secondary);
            margin: 0;
        }
    }

    .feature-number {
        font-family: var(--font-heading);
        font-size: 2.5rem;
        background: linear-gradient(
            135deg,
            var(--primary-400) 0%,
            var(--accent-400) 100%
        );
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }
</style>
