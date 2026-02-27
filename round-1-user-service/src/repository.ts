import { retry, handleAll, circuitBreaker, ExponentialBackoff, ConsecutiveBreaker } from 'cockatiel';
import { pino } from 'pino';
import { Sequelize, DataTypes, Model, Optional } from 'sequelize';
import path from 'path';
import crypto from 'crypto';

const logger = pino();

const isMySQL = !!process.env.DB_HOST;

const sequelize = isMySQL
    ? new Sequelize(
        process.env.DB_NAME || 'user_db',
        process.env.DB_USER || 'root',
        process.env.DB_PASS || 'password',
        { host: process.env.DB_HOST, dialect: 'mysql', logging: false }
    )
    : new Sequelize({
        dialect: 'sqlite',
        storage: path.join(process.cwd(), 'data', 'database.sqlite'),
        logging: false,
    });

export interface User {
    user_id: string;
    name: string;
    email: string;
    phone: string;
    created_at: string;
}

interface UserCreationAttributes extends Optional<User, 'created_at' | 'user_id'> { }

class UserModel extends Model<User, UserCreationAttributes> implements User {
    public user_id!: string;
    public name!: string;
    public email!: string;
    public phone!: string;
    public created_at!: string;
}

UserModel.init(
    {
        user_id: { type: DataTypes.STRING, primaryKey: true },
        name: { type: DataTypes.STRING, allowNull: false },
        email: { type: DataTypes.STRING, allowNull: false },
        phone: { type: DataTypes.STRING, allowNull: false },
        created_at: { type: DataTypes.STRING, allowNull: false },
    },
    { sequelize, modelName: 'user' }
);

class IdempotencyModel extends Model {
    public key!: string;
    public response!: object;
}

IdempotencyModel.init(
    {
        key: { type: DataTypes.STRING, primaryKey: true },
        response: { type: DataTypes.JSON, allowNull: false },
    },
    { sequelize, modelName: 'idempotency' }
);

const retryPolicy = retry(handleAll, {
    maxAttempts: 3,
    backoff: new ExponentialBackoff({ initialDelay: 100, maxDelay: 1000 }),
});

const breakerPolicy = circuitBreaker(handleAll, {
    halfOpenAfter: 10000,
    breaker: new ConsecutiveBreaker(5),
});

export class UserRepository {
    static async sync() {
        await sequelize.sync();
    }

    // Automatic Idempotency Key Generation
    private generateHash(data: any): string {
        return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    }

    async createUser(userData: Partial<User>, externalKey?: string): Promise<User> {
        return await retryPolicy.execute(() =>
            breakerPolicy.execute(async () => {
                // Step 1: Handle Idempotency automatically
                // If client provides a key, use it. Otherwise, generate a hash of the payload
                const key = externalKey || this.generateHash(userData);

                const cached = await IdempotencyModel.findByPk(key);
                if (cached) {
                    logger.info({ key }, 'Automatic Idempotency: Returning cached response');
                    return cached.response as User;
                }

                // Step 2: Auto-generate user_id if missing
                const user: User = {
                    user_id: userData.user_id || `u_${Math.floor(Math.random() * 1000000)}`,
                    name: userData.name || 'Anonymous',
                    email: userData.email || 'unknown@example.com',
                    phone: userData.phone || '000',
                    created_at: userData.created_at || new Date().toISOString(),
                };

                // Step 3: Simulate failure requirement
                if (Math.random() < 0.1) throw new Error('Database write failure');

                // Step 4: Transactional persistence
                return await sequelize.transaction(async (t) => {
                    const created = await UserModel.create(user, { transaction: t });
                    await IdempotencyModel.create({ key, response: created }, { transaction: t });
                    return created.get({ plain: true });
                });
            })
        );
    }

    async getUser(id: string): Promise<User | null> {
        return await retryPolicy.execute(() =>
            breakerPolicy.execute(async () => {
                const user = await UserModel.findByPk(id);
                return user ? (user.toJSON() as User) : null;
            })
        );
    }
}
