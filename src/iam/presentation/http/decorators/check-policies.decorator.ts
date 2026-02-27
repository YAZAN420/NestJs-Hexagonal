import { Reflector } from '@nestjs/core';
import { PolicyHandler } from '../interfaces/policy-handler.interface';

export const CheckPolicies = Reflector.createDecorator<PolicyHandler[]>();
