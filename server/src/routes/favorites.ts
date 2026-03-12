import express, { type Request, type Response } from 'express';

const router = express.Router();

// In-memory storage for favorites (in production, use a database)
const favorites: any[] = [];

/**
 * POST /api/v1/favorites
 * Add a work to favorites
 * Body parameters:
 *   - type: Work type - 'photo' | 'audio' | 'play' | 'use'
 *   - imageUrl: Image URL (optional)
 *   - videoUrl: Video URL (optional)
 *   - title: Work title
 *   - metadata: Additional metadata
 * Response:
 *   - success: boolean
 *   - id: Favorite ID
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { type, imageUrl, videoUrl, title, metadata } = req.body;

    if (!type || (!imageUrl && !videoUrl)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const favorite = {
      id: Date.now().toString(),
      type,
      imageUrl,
      videoUrl,
      title,
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
    };

    favorites.push(favorite);

    console.log(`Added to favorites: ${type} - ${title || 'Untitled'}`);

    res.json({
      success: true,
      id: favorite.id,
      favorite,
    });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({
      error: 'Failed to add favorite',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/favorites
 * Get all favorites
 * Response:
 *   - success: boolean
 *   - favorites: Array of favorites
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      favorites,
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({
      error: 'Failed to get favorites',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/v1/favorites/:id
 * Remove a work from favorites
 * Response:
 *   - success: boolean
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const index = favorites.findIndex(f => f.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Favorite not found' });
    }

    favorites.splice(index, 1);

    console.log(`Removed from favorites: ${id}`);

    res.json({
      success: true,
    });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({
      error: 'Failed to remove favorite',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
