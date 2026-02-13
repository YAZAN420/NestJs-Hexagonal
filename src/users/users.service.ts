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

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly hashService: HashingService,
  ) {}

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

  async findAll() {
    return await this.userModel.find().lean().exec();
  }

  async findOne(id: string) {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
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

  async update(id: string, updateUserDto: UpdateUserDto | Partial<User>) {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('Cannot update: User not found');
    }
    return updatedUser;
  }

  async remove(id: string) {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Cannot delete: User not found');
    }
    return { message: 'User deleted successfully' };
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
}
