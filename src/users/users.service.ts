import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { HydratedDocument, Model } from 'mongoose';
import { HashingService } from 'src/iam/hashing/hashing.service';
import { plainToInstance } from 'class-transformer';
import { User } from './schemas/user.schema';
import { UserEntity } from './entities/user.entity';
import { BaseService } from 'src/common/services/base.service';
import { CaslAbilityFactory } from 'src/iam/authorization/casl/casl-ability.factory';

@Injectable()
export class UsersService extends BaseService<User> {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    protected readonly abilityFactory: CaslAbilityFactory,
    private readonly hashService: HashingService,
  ) {
    super(userModel, abilityFactory, User);
  }

  async create(createUserDto: CreateUserDto) {
    const exists = await this.userModel
      .findOne({
        $or: [
          { email: createUserDto.email },
          { username: createUserDto.username },
        ],
      })
      .exec();

    if (exists) {
      const isEmailConflict = exists.email === createUserDto.email;
      const message = isEmailConflict
        ? 'Email already exists'
        : 'Username already exists';

      throw new ConflictException(message);
    }

    const hashedPassword = await this.hashService.hash(createUserDto.password);

    const newUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser: HydratedDocument<User> = await newUser.save();
    return plainToInstance(UserEntity, savedUser.toObject(), {
      excludeExtraneousValues: true,
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    return super.update(id, updateUserDto);
  }

  async findOneEmail(email: string) {
    const user = await this.userModel
      .findOne({ email })
      .select('+password')
      .exec();
    if (!user) {
      throw new NotFoundException(`User with Email ${email} not found`);
    }
    return user;
  }

  async findOneWithRefreshToken(id: string) {
    const user = await this.userModel
      .findById(id)
      .select('+refreshToken')
      .exec();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async updateRefreshToken(id: string, refreshToken: string | null) {
    await this.userModel.findByIdAndUpdate(id, { refreshToken }).exec();
  }
}
