import { Link, useNavigate } from 'react-router'
import { useDebugActions } from '@/debug/use-debug-actions'
import './usage-data.css'

/** Usage-data collection notice, linked from the "Li e aceito" checkbox of the sign-up. */
export default function UsageData() {
  const navigate = useNavigate()
  useDebugActions('Aviso de coleta', [{ label: 'Abrir o cadastro', run: () => navigate('/app/register') }])

  return (
    <article className="auth-form usage-data">
      <h1>Aviso de coleta de dados de uso</h1>
      <p>Para melhorar o He4rt Hub, medimos como ele é usado desde o primeiro dia.</p>
      <ul>
        <li>
          <strong>PostHog</strong> registra eventos, como criar conta, entrar num squad ou publicar no diário.
        </li>
        <li>
          <strong>Clarity</strong> registra mapa de calor e o caminho de navegação.
        </li>
        <li>Dados pessoais são mascarados, e o que você digita fica oculto nas gravações de sessão.</li>
        <li>Nada do seu perfil vai para uma empresa sem o seu consentimento.</li>
      </ul>
      <h2>LGPD</h2>
      <p>
        O tratamento segue a LGPD. Você pode pedir acesso, correção ou exclusão dos seus dados a qualquer momento.
      </p>
      <h2>Menores de idade</h2>
      <p>
        O He4rt Hub está disponível a partir dos 18 anos. Quando alguém informa uma idade menor no cadastro, a conta
        não é criada e nenhum dado digitado é guardado.
      </p>
      <p className="auth-form__footer">
        <Link to="/app/register">Voltar para o cadastro</Link>
      </p>
    </article>
  )
}
