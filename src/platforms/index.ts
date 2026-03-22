import { registry } from './registry';
import DoubaoAdapter from './doubao';
import DeepseekAdapter from './deepseek';
import YuanbaoAdapter from './yuanbao';
import PerplexityAdapter from './perplexity';

// 注册内置平台
registry.register('doubao', DoubaoAdapter);
registry.register('deepseek', DeepseekAdapter);
registry.register('yuanbao', YuanbaoAdapter);
registry.register('perplexity', PerplexityAdapter);

export { registry } from './registry';
export { PlatformAdapter } from './base';