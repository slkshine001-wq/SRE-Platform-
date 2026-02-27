import server from './app';
import { UserRepository } from './repository';

const start = async () => {
    try {
        console.log('Synchronizing with MySQL Database...');
        await UserRepository.sync();
        console.log('Database synchronized');

        const port = process.env.PORT ? parseInt(process.env.PORT) : 54321;
        await server.listen({ port, host: '0.0.0.0' });
        console.log(`Server listening on http://localhost:${port}`);
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
};

start();
